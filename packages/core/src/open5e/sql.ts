import type { ClassDetail, Condition, LicenseText, Monster, SourceDocument, Spell } from "@table-forge/shared";
import { foldName } from "../fold.js";

/**
 * SQL for an Open5e import. The tables are defined in apps/worker/migrations.
 *
 * Safe to re-run, and a run that stops partway leaves the previous data in place:
 *  1. Every record is an upsert stamped with this run's `import_run` marker.
 *  2. Only at the very end, rows from Open5e documents that did not get this run's
 *     marker (stale rows) are deleted.
 *
 * Private and homebrew rows are never touched. An upsert is skipped, not applied,
 * when its document is not an Open5e one, or when its id is already used by a row
 * belonging to a document with another origin.
 */

/** Everything one import writes. */
export interface ImportBundle {
  documents: SourceDocument[];
  licenses: LicenseText[];
  spells: Spell[];
  monsters: Monster[];
  classes: ClassDetail[];
  conditions: Condition[];
}

/** D1 rejects statements over 100 KB. */
export const MAX_STATEMENT_BYTES = 100_000;

/** Size of a string once encoded as UTF-8 (core has no TextEncoder in its type environment). */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** True when D1 would reject the statement for its size. */
export const isStatementTooLarge = (statement: string): boolean => utf8Length(statement) > MAX_STATEMENT_BYTES;

export function sqlText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return `'${value.replace(/\u0000/g, "").replace(/'/g, "''")}'`;
}

function sqlInt(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`not a finite number: ${value}`);
  return String(value);
}

const sqlBool = (value: boolean): string => (value ? "1" : "0");
const sqlNullableText = (value: string | null): string => (value === null ? "NULL" : sqlText(value));
const json = (value: unknown): string => sqlText(JSON.stringify(value));

type Column = [name: string, sqlValue: string];
type RecordTable = "spells" | "monsters" | "classes" | "conditions";

const updates = (cols: Column[], skip: string): string =>
  cols
    .filter(([name]) => name !== skip)
    .map(([name]) => `${name} = excluded.${name}`)
    .join(", ");

/**
 * A record upsert. Inserts only when its document is an Open5e document, and updates an
 * existing row only when that row's document is an Open5e one too, so an Open5e record
 * can never overwrite a private or homebrew row that happens to share its id.
 */
function recordUpsert(table: RecordTable, documentKey: string, cols: Column[], run: string): string {
  const all: Column[] = [...cols, ["import_run", sqlText(run)]];
  return (
    `INSERT INTO ${table} (${all.map(([n]) => n).join(", ")}) SELECT ${all.map(([, v]) => v).join(", ")} ` +
    `WHERE EXISTS (SELECT 1 FROM documents WHERE key = ${sqlText(documentKey)} AND origin = 'open5e') ` +
    `ON CONFLICT(id) DO UPDATE SET ${updates(all, "id")} ` +
    `WHERE (SELECT origin FROM documents WHERE key = ${table}.document_key) = 'open5e';`
  );
}

/** Class slugs are stored as `,wizard,sorcerer,` so a filter can match `%,wizard,%` without a join table. */
export function documentStatement(d: SourceDocument, run: string): string {
  const cols: Column[] = [
    ["key", sqlText(d.key)],
    ["origin", sqlText(d.origin)],
    ["visibility", sqlText(d.visibility)],
    ["name", sqlText(d.name)],
    ["display_name", sqlText(d.displayName)],
    ["game_system", sqlText(d.gameSystem)],
    ["data", json(d)],
    ["import_run", sqlText(run)],
  ];
  return (
    `INSERT INTO documents (${cols.map(([n]) => n).join(", ")}) VALUES (${cols.map(([, v]) => v).join(", ")}) ` +
    `ON CONFLICT(key) DO UPDATE SET ${updates(cols, "key")} WHERE documents.origin = 'open5e';`
  );
}

export function licenseStatement(l: LicenseText, run: string): string {
  const cols: Column[] = [
    ["key", sqlText(l.key)],
    ["origin", "'open5e'"],
    ["name", sqlText(l.name)],
    ["url", sqlNullableText(l.url)],
    ["text", sqlText(l.text)],
    ["import_run", sqlText(run)],
  ];
  return (
    `INSERT INTO licenses (${cols.map(([n]) => n).join(", ")}) VALUES (${cols.map(([, v]) => v).join(", ")}) ` +
    `ON CONFLICT(key) DO UPDATE SET ${updates(cols, "key")} WHERE licenses.origin = 'open5e';`
  );
}

export function spellStatement(s: Spell, run: string): string {
  const classes = s.classes.length > 0 ? `,${s.classes.join(",")},` : "";
  return recordUpsert(
    "spells",
    s.documentKey,
    [
      ["id", sqlText(s.id)],
      ["document_key", sqlText(s.documentKey)],
      ["name", sqlText(s.name)],
      ["name_search", sqlText(foldName(s.name))],
      ["level", sqlInt(s.level)],
      ["school", sqlText(s.school)],
      ["classes", sqlText(classes)],
      ["concentration", sqlBool(s.concentration)],
      ["ritual", sqlBool(s.ritual)],
      ["casting_time", sqlText(s.castingTime)],
      ["range_text", sqlText(s.range)],
      ["data", json(s)],
    ],
    run,
  );
}

export function monsterStatement(m: Monster, run: string): string {
  return recordUpsert(
    "monsters",
    m.documentKey,
    [
      ["id", sqlText(m.id)],
      ["document_key", sqlText(m.documentKey)],
      ["name", sqlText(m.name)],
      ["name_search", sqlText(foldName(m.name))],
      ["size", sqlText(m.size)],
      ["type", sqlText(m.type)],
      ["challenge_rating", sqlInt(m.challengeRating)],
      ["armor_class", sqlInt(m.armorClass)],
      ["hit_points", sqlInt(m.hitPoints)],
      ["data", json(m)],
    ],
    run,
  );
}

export function classStatement(c: ClassDetail, run: string): string {
  return recordUpsert(
    "classes",
    c.documentKey,
    [
      ["id", sqlText(c.id)],
      ["document_key", sqlText(c.documentKey)],
      ["name", sqlText(c.name)],
      ["name_search", sqlText(foldName(c.name))],
      ["parent_id", sqlNullableText(c.parentClass?.id ?? null)],
      ["parent_name", sqlNullableText(c.parentClass?.name ?? null)],
      ["hit_dice", sqlNullableText(c.hitDice)],
      ["caster_type", sqlNullableText(c.casterType)],
      ["data", json(c)],
    ],
    run,
  );
}

export function conditionStatement(c: Condition, run: string): string {
  return recordUpsert(
    "conditions",
    c.documentKey,
    [
      ["id", sqlText(c.id)],
      ["document_key", sqlText(c.documentKey)],
      ["name", sqlText(c.name)],
      ["name_search", sqlText(foldName(c.name))],
      ["data", json(c)],
    ],
    run,
  );
}

/** Deletes Open5e rows that this run did not stamp. Always the last statements of an import. */
export function staleRowStatements(run: string): string[] {
  const stale = `import_run IS NOT ${sqlText(run)}`;
  return [
    ...(["spells", "monsters", "classes", "conditions"] as const).map(
      (table) => `DELETE FROM ${table} WHERE document_key IN (SELECT key FROM documents WHERE origin = 'open5e') AND ${stale};`,
    ),
    `DELETE FROM documents WHERE origin = 'open5e' AND ${stale};`,
    `DELETE FROM licenses WHERE origin = 'open5e' AND ${stale};`,
  ];
}

/** One query that counts the rows this run stamped, per table, to find skipped upserts. */
export function countStampedStatement(run: string): string {
  const r = sqlText(run);
  const one = (t: string) => `(SELECT COUNT(*) FROM ${t} WHERE import_run = ${r}) AS ${t}`;
  return `SELECT ${["documents", "licenses", "spells", "monsters", "classes", "conditions"].map(one).join(", ")};`;
}

/** The whole import, in order: upserts first, stale deletes last. */
export function buildImportStatements(bundle: ImportBundle, run: string): string[] {
  return [
    ...bundle.documents.map((d) => documentStatement(d, run)),
    ...bundle.licenses.map((l) => licenseStatement(l, run)),
    ...bundle.spells.map((s) => spellStatement(s, run)),
    ...bundle.monsters.map((m) => monsterStatement(m, run)),
    ...bundle.classes.map((c) => classStatement(c, run)),
    ...bundle.conditions.map((c) => conditionStatement(c, run)),
    ...staleRowStatements(run),
  ];
}
