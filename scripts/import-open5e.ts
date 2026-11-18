/**
 * Imports Open5e rules data into D1.
 *
 *   pnpm import:open5e            fetch, normalise, write SQL, apply to the LOCAL database
 *   pnpm import:open5e --no-apply fetch, normalise and write the SQL file only (this skips
 *                                 the comparison with the database, since it never reads it)
 *   pnpm import:open5e --force    skip the "far fewer records than the database holds" check
 *   pnpm import:open5e --remote   apply to the REMOTE database (needs a real database_id)
 *
 * Which documents are imported is decided by OPEN5E_CONTENT_RULES in
 * packages/core/src/open5e/config.ts. Every record is normalised by
 * packages/core/src/open5e and validated against the packages/shared schemas. A record
 * that fails is counted and skipped; it does not abort the import.
 *
 * Safety:
 *  - Guard: before any SQL is written, checkImport (packages/core/src/open5e/guard.ts)
 *    stops the run with a non-zero exit if a type has no valid records, too many records
 *    fail validation, or a type has far fewer records than the database holds now.
 *    The migrations are applied first, because the guard reads the database.
 *  - Upserts: every row is upserted with this run's `import_run` marker.
 *  - Deletes last: Open5e rows without the marker are deleted at the very end of the
 *    file, so a run that fails partway leaves the previous data in place.
 *  - Private and homebrew rows are never touched or overwritten. An upsert that would
 *    collide with one is skipped and counted.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkImport,
  classStatement,
  conditionStatement,
  countStampedStatement,
  documentStatement,
  isDocumentIncluded,
  isStatementTooLarge,
  licenseStatement,
  monsterStatement,
  normaliseLicense,
  spellStatement,
  staleRowStatements,
  normaliseClass,
  resolveSubclassParents,
  normaliseConditions,
  normaliseDocument,
  normaliseMonster,
  normaliseSpell,
  OPEN5E_API_BASE,
  OPEN5E_CONTENT_RULES,
  type RawClass,
  type RawCondition,
  type RawCreature,
  type RawDocument,
  type RawLicense,
  type RawSpell,
} from "@table-forge/core";
import { RULE_TABLES, ClassDetail, Condition, LicenseText, Monster, SourceDocument, Spell } from "@table-forge/shared";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(root, "apps/worker");
// Under .wrangler/, which is gitignored: generated SQL must never be committed.
const outDir = path.join(workerDir, ".wrangler/import");

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const apply = !args.has("--no-apply");
const force = args.has("--force");
for (const a of args) if (!["--remote", "--no-apply", "--force"].includes(a)) throw new Error(`unknown argument ${a}`);

const PAGE_LIMIT = 200;
const apiOrigin = new URL(OPEN5E_API_BASE).origin;

const MAX_ATTEMPTS = 4;

async function fetchJson(url: string): Promise<unknown> {
  // The `next` links in a response are untrusted: only follow them to the API itself.
  if (new URL(url).origin !== apiOrigin) throw new Error(`refusing to fetch ${url}`);
  for (let attempt = 1; ; attempt++) {
    let retryable = true;
    let failure: string;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return await res.json();
      failure = `HTTP ${res.status}`;
      // Only rate limits and server errors can clear up by themselves.
      retryable = res.status === 429 || res.status >= 500;
    } catch (err) {
      failure = String(err); // network error or timeout
    }
    if (!retryable || attempt >= MAX_ATTEMPTS) throw new Error(`failed to fetch ${url}: ${failure}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1))); // 1s, 2s, 4s
  }
}

/** Every record of a paginated Open5e list endpoint. */
async function fetchAll<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const first = new URL(`${OPEN5E_API_BASE}/${endpoint}/`);
  first.searchParams.set("limit", String(PAGE_LIMIT));
  for (const [k, v] of Object.entries(params)) first.searchParams.set(k, v);
  const out: T[] = [];
  let next: string | null = first.toString();
  while (next) {
    const page = (await fetchJson(next)) as { results: T[]; next: string | null };
    if (!Array.isArray(page.results)) throw new Error(`unexpected response from ${next}`);
    out.push(...page.results);
    next = page.next;
  }
  return out;
}

interface Stats {
  fetched: number;
  imported: number;
  failed: number;
  /** Fetched records that produced nothing (for example conditions described only by excluded documents). */
  empty: number;
  reasons: Map<string, number>;
  byDocument: Map<string, number>;
}
const newStats = (): Stats => ({ fetched: 0, imported: 0, failed: 0, empty: 0, reasons: new Map(), byDocument: new Map() });

function fail(stats: Stats, key: string, reason: string): void {
  stats.failed++;
  const short = reason.replace(/\s+/g, " ").slice(0, 160);
  stats.reasons.set(short, (stats.reasons.get(short) ?? 0) + 1);
  if (stats.failed <= 3 || process.env.VERBOSE) console.warn(`  skipped ${key}: ${short}`);
}

/** Normalises and validates every raw record; failures are counted, not thrown. */
interface Converted<Out> {
  record: Out;
  /** The record's SQL statement, built once here and reused for the file. */
  statement: string;
}

function convert<Raw extends { key: string }, Out extends { id: string; documentKey: string }>(
  label: string,
  raws: Raw[],
  stats: Stats,
  normalise: (raw: Raw) => Out[],
  schema: { parse(input: unknown): Out },
  toStatement: (record: Out) => string,
  includedDocuments: Set<string>,
): Converted<Out>[] {
  const seen = new Set<string>();
  const out: Converted<Out>[] = [];
  for (const raw of raws) {
    stats.fetched++;
    try {
      const candidates = normalise(raw);
      if (candidates.length === 0) stats.empty++;
      for (const candidate of candidates) {
        const record = schema.parse(candidate);
        if (!includedDocuments.has(record.documentKey)) throw new Error(`document "${record.documentKey}" is not an included document`);
        if (seen.has(record.id)) throw new Error("duplicate id");
        const statement = toStatement(record);
        if (isStatementTooLarge(statement)) throw new Error("statement too large for D1");
        seen.add(record.id);
        out.push({ record, statement });
        stats.imported++;
        stats.byDocument.set(record.documentKey, (stats.byDocument.get(record.documentKey) ?? 0) + 1);
      }
    } catch (err) {
      fail(stats, raw.key, err instanceof Error ? (err.name === "ZodError" ? zodSummary(err) : err.message) : String(err));
    }
  }
  console.log(`${label}: ${stats.imported} records ok from ${stats.fetched} fetched, ${stats.failed} failed, ${stats.empty} had nothing from an included document`);
  return out;
}

function summary(s: Stats): { fetched: number; valid: number; failed: number } {
  return { fetched: s.fetched, valid: s.imported, failed: s.failed };
}

function zodSummary(err: Error): string {
  const issues = (err as unknown as { issues?: { path: (string | number)[]; message: string }[] }).issues ?? [];
  return issues
    .slice(0, 2)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}

async function main(): Promise<void> {
  // Marks the rows this run writes, so rows it did not write can be recognised as stale.
  const run = new Date().toISOString();
  console.log(`Open5e import (${remote ? "REMOTE" : "local"} database${apply ? "" : ", SQL file only"})`);

  const allDocuments = await fetchAll<RawDocument & { gamesystem: { key: string; name: string } }>("documents");
  const included = allDocuments.filter((d) => isDocumentIncluded(d));
  const excluded = allDocuments.filter((d) => !isDocumentIncluded(d));
  console.log(`\nDocuments: ${included.length} included, ${excluded.length} excluded`);
  console.log("Rules:", JSON.stringify(OPEN5E_CONTENT_RULES));
  for (const d of included) console.log(`  + ${d.key.padEnd(24)} ${d.gamesystem.key.padEnd(8)} ${d.name}`);
  for (const d of excluded) console.log(`  - ${d.key.padEnd(24)} ${d.gamesystem.key.padEnd(8)} ${d.name}`);
  const includedKeys = new Set(included.map((d) => d.key));

  const stats = { spells: newStats(), monsters: newStats(), classes: newStats(), conditions: newStats() };
  console.log("");

  const rawSpells: RawSpell[] = [];
  const rawCreatures: RawCreature[] = [];
  const rawClasses: RawClass[] = [];
  for (const d of included) {
    process.stdout.write(`fetching ${d.key}...\r`);
    rawSpells.push(...(await fetchAll<RawSpell>("spells", { document__key: d.key })));
    rawCreatures.push(...(await fetchAll<RawCreature>("creatures", { document__key: d.key })));
    rawClasses.push(...(await fetchAll<RawClass>("classes", { document__key: d.key })));
  }
  // Conditions are one record per condition with a description per document, so fetch them all
  // and let the normaliser keep the descriptions from included documents.
  const rawConditions = await fetchAll<RawCondition>("conditions");

  const spells = convert("spells", rawSpells, stats.spells, (r) => [normaliseSpell(r)], Spell, (r) => spellStatement(r, run), includedKeys);
  const monsters = convert("monsters", rawCreatures, stats.monsters, (r) => [normaliseMonster(r)], Monster, (r) => monsterStatement(r, run), includedKeys);
  // A subclass's parent must be a class we store (see resolveSubclassParents), so normalise every class first,
  // resolve the parents across the whole set, and only then validate, count and build statements, once each.
  const normalisedClasses = new Map<string, ClassDetail | Error>();
  for (const r of rawClasses) {
    try {
      normalisedClasses.set(r.key, normaliseClass(r));
    } catch (err) {
      normalisedClasses.set(r.key, err instanceof Error ? err : new Error(String(err)));
    }
  }
  const resolved = resolveSubclassParents([...normalisedClasses.values()].filter((c): c is ClassDetail => !(c instanceof Error)));
  for (const c of resolved.classes) normalisedClasses.set(c.id, c);
  const classes = convert(
    "classes",
    rawClasses,
    stats.classes,
    (r) => {
      const c = normalisedClasses.get(r.key);
      if (c instanceof Error) throw c;
      return c ? [c] : [];
    },
    ClassDetail,
    (r) => classStatement(r, run),
    includedKeys,
  );
  console.log(`Subclass parents: ${resolved.remapped} remapped to a stored class, ${resolved.unresolved.length} unresolved (kept as subclasses, parent shown as text)`);
  for (const u of resolved.unresolved) console.log(`  unresolved: ${u.id} (${u.name}) wanted parent "${u.parentClass?.name ?? "?"}"`);
  const conditions = convert(
    "conditions",
    rawConditions,
    stats.conditions,
    (r) => normaliseConditions(r, (key) => includedKeys.has(key)),
    Condition,
    (r) => conditionStatement(r, run),
    includedKeys,
  );

  const where = remote ? "--remote" : "--local";
  /** Runs one SELECT with `wrangler d1 execute --json` and returns its first row. Throws if the output is not as expected. */
  const d1Row = (target: string, sql: string): Record<string, number> => {
    const out = execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", "DB", target, "--json", "--command", sql], { cwd: workerDir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
    let parsed: unknown;
    try {
      parsed = JSON.parse(out);
    } catch {
      throw new Error(`could not parse wrangler's JSON output: ${out.slice(0, 200)}`);
    }
    const row = (parsed as { results?: Record<string, number>[] }[])[0]?.results?.[0];
    if (!row) throw new Error("wrangler returned no row for a count query");
    return row;
  };
  const wrangler = (quiet: boolean, ...a: string[]) =>
    execFileSync("pnpm", ["exec", "wrangler", ...a], { cwd: workerDir, stdio: quiet ? ["ignore", "ignore", "inherit"] : "inherit", maxBuffer: 1 << 28 });

  // The stale-row deletes remove whatever Open5e did not return this time, so stop before writing
  // anything if the fetch or the validation went badly wrong.
  let existing: Record<string, number> | null = null;
  if (apply) {
    console.log(`\nApplying migrations (${where})...`);
    wrangler(false, "d1", "migrations", "apply", "DB", where);
    // Only rows of documents that are included now: dropping a document from the rules
    // must not look like data loss.
    const keys = [...includedKeys].map((k) => {
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(k)) throw new Error(`unexpected document key "${k}"`);
      return `'${k}'`;
    });
    const counts = RULE_TABLES.map((t) => `(SELECT COUNT(*) FROM ${t} WHERE document_key IN (${keys.join(", ")}) AND document_key IN (SELECT key FROM documents WHERE origin = 'open5e')) AS ${t}`);
    existing = d1Row(where, `SELECT ${counts.join(", ")};`);
    for (const t of RULE_TABLES) if (typeof existing[t] !== "number") throw new Error(`could not read the existing ${t} count from D1`);
  }
  const problems = checkImport(
    { spells: summary(stats.spells), monsters: summary(stats.monsters), classes: summary(stats.classes), conditions: summary(stats.conditions) },
    existing,
    { maxFailureRate: 0.05, maxDropRate: 0.2, force },
  );
  if (problems.length > 0) {
    console.error("\nImport stopped. Only the migrations were applied; no data was written or changed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  // Only documents that actually supply a record are stored (and credited).
  const used = new Set([...spells, ...monsters, ...classes, ...conditions].map((c) => c.record.documentKey));
  const documents = included
    .filter((d) => used.has(d.key))
    .map((d) => {
      const record = SourceDocument.parse(normaliseDocument(d));
      return { record, statement: documentStatement(record, run) };
    });

  // Full licence texts for every licence a stored document uses.
  const neededLicenses = new Set(documents.flatMap((d) => d.record.licenses.map((l) => l.key)));
  const licenses = (await fetchAll<RawLicense>("licenses"))
    .filter((l) => neededLicenses.has(l.key))
    .map((l) => LicenseText.parse(normaliseLicense(l)))
    .map((record) => ({ record, statement: licenseStatement(record, run) }));
  for (const key of neededLicenses) if (!licenses.some((l) => l.record.key === key)) console.warn(`  no licence text from Open5e for "${key}"`);
  for (const l of licenses) if (isStatementTooLarge(l.statement)) throw new Error(`licence ${l.record.key} is too large for D1`);

  // Upserts first, stale-row deletes last: a run that fails partway leaves the old data in place.
  const statements = [
    ...documents.map((d) => d.statement),
    ...licenses.map((l) => l.statement),
    ...[...spells, ...monsters, ...classes, ...conditions].map((c) => c.statement),
    ...staleRowStatements(run),
  ];
  mkdirSync(outDir, { recursive: true });
  const sqlFile = path.join(outDir, "open5e-import.sql");
  writeFileSync(sqlFile, statements.join("\n") + "\n");
  console.log(`\nWrote ${statements.length} statements to ${path.relative(root, sqlFile)} (run ${run})`);

  console.log("\nCounts per document (spells / monsters / classes / conditions):");
  for (const d of documents) {
    const n = (s: Stats) => s.byDocument.get(d.record.key) ?? 0;
    console.log(`  ${d.record.key.padEnd(24)} ${n(stats.spells)} / ${n(stats.monsters)} / ${n(stats.classes)} / ${n(stats.conditions)}`);
  }
  console.log("\nValidation failures:");
  for (const [type, s] of Object.entries(stats)) {
    console.log(`  ${type}: ${s.failed} failed of ${s.fetched}`);
    for (const [reason, n] of [...s.reasons].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(`    ${n} x ${reason}`);
  }

  if (!apply) return;
  console.log(`\nApplying ${statements.length} statements (${where})...`);
  wrangler(true, "d1", "execute", "DB", where, "--file", sqlFile, "--yes");

  // Upserts that were skipped (an id or document belonging to a private/homebrew row) leave rows without this run's marker.
  const stamped = d1Row(where, countStampedStatement(run));
  const expected = { documents: documents.length, licenses: licenses.length, spells: spells.length, monsters: monsters.length, classes: classes.length, conditions: conditions.length };
  let skipped = 0;
  for (const [table, want] of Object.entries(expected)) {
    const diff = want - (stamped[table] ?? 0);
    skipped += diff;
    if (diff !== 0) console.warn(`  ${diff} ${table} rows were skipped because they collide with a non-Open5e row`);
  }
  console.log(`Done. ${skipped} upserts skipped.`);
}

await main();
