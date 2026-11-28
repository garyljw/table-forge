import { foldName } from "@table-forge/core";
import { CORE_RULES_DOCUMENT_KEYS, RULE_TABLES, type RuleTable } from "@table-forge/shared";

/**
 * Query building for the rules tables. Every value reaches SQL as a bound parameter;
 * the only text spliced into a statement is column and table names written in this
 * codebase.
 */

/**
 * Which documents a request may read. Built only by `documentScopeFor` (permissions.ts), from the
 * caller's identity, so a route cannot widen it by accident. Every query in this file takes one.
 */
export interface DocumentScope {
  readonly includePrivate: boolean;
}

/**
 * THE one place the document visibility rule is written as SQL. `d` is the `documents` table.
 * Public documents are always readable; private ones (the owner's transcribed books) only when
 * the scope says so. Both fragments are fixed text: nothing from the request reaches them.
 */
export function visibilityClause(scope: DocumentScope): string {
  return scope.includePrivate ? "d.visibility IN ('public', 'private')" : "d.visibility = 'public'";
}

/**
 * Collects `WHERE` conditions and their bound values. `t` is the record table and `d`
 * the `documents` table it is joined to. The first condition is always the visibility
 * clause for the caller's scope, and it cannot be removed.
 */
export class Where {
  private readonly clauses: string[];
  constructor(scope: DocumentScope) {
    this.clauses = [visibilityClause(scope)];
  }
  readonly params: (string | number)[] = [];

  add(clause: string, ...values: (string | number)[]): this {
    this.clauses.push(clause);
    this.params.push(...values);
    return this;
  }

  /**
   * Name search on the folded name (lowercase, accents removed), so "helene" finds "Hélène".
   * Uses instr(), not LIKE: D1 rejects LIKE patterns over 50 bytes, and instr needs no escaping.
   * `parseQuery` rejects a `q` that folds to nothing; this throws if one ever gets past it,
   * because an empty needle would match every row.
   */
  nameContains(q: string | undefined): this {
    if (q === undefined) return this;
    const folded = foldName(q);
    if (folded === "") throw new Error("empty search term");
    return this.add("instr(t.name_search, ?) > 0", folded);
  }

  document(key: string | undefined): this {
    return key === undefined ? this : this.add("t.document_key = ?", key);
  }

  /**
   * Narrows to the core rules documents when `on` is true. Only ever adds a condition (ANDed with the
   * visibility clause), so it cannot widen what a caller may read. Keys are bound parameters.
   */
  coreOnly(on: boolean | undefined): this {
    if (on !== true) return this;
    return this.add(`t.document_key IN (${CORE_RULES_DOCUMENT_KEYS.map(() => "?").join(", ")})`, ...CORE_RULES_DOCUMENT_KEYS);
  }

  get sql(): string {
    return this.clauses.join(" AND ");
  }
}

export interface Page<Row> {
  rows: Row[];
  total: number;
}

/**
 * The ORDER BY clauses a list may use. A fixed allow-list: the clause is chosen by key and never built
 * from request input. Every one ends in `t.id` so paging is stable.
 */
const PAGE_ORDERS = {
  name: "t.name COLLATE NOCASE, t.id",
  /** Rules chapters, in the SRD's book order. */
  chapter: "t.sort_index, t.name COLLATE NOCASE, t.id",
  /** Reference entries: sizes and rarities by rank, everything else (no rank) by name. */
  reference: "t.sort_rank, t.name COLLATE NOCASE, t.id",
} as const;

export type PageOrder = keyof typeof PAGE_ORDERS;

/** One page of rows plus the total count, in a single D1 round trip. */
export async function selectPage<Row>(
  db: D1Database,
  table: RuleTable,
  columns: string,
  where: Where,
  page: number,
  pageSize: number,
  order: PageOrder = "name",
): Promise<Page<Row>> {
  const orderBy = PAGE_ORDERS[order];
  if (orderBy === undefined) throw new Error(`unknown page order "${String(order)}"`);
  const from = `FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE ${where.sql}`;
  const [count, rows] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...where.params),
    db
      .prepare(`SELECT ${columns} ${from} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...where.params, pageSize, (page - 1) * pageSize),
  ]);
  return { rows: (rows?.results ?? []) as Row[], total: Number((count?.results[0] as { n: number } | undefined)?.n ?? 0) };
}

export function pageEnvelope<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

/** A record's JSON and its document's JSON, or null when the id is unknown or its document is not visible to `scope`. */
export async function selectDetail(
  db: D1Database,
  scope: DocumentScope,
  table: RuleTable,
  id: string,
): Promise<{ data: unknown; document: unknown } | null> {
  const row = await db
    .prepare(
      `SELECT t.data AS data, d.data AS document FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE t.id = ? AND ${visibilityClause(scope)}`,
    )
    .bind(id)
    .first<{ data: string; document: string }>();
  return row ? { data: JSON.parse(row.data), document: JSON.parse(row.document) } : null;
}

export type ChildTable = "classes" | "species" | "rules";

/** Fixed query text per table: the table name is never taken from the caller. `columns` is written in this codebase. */
const CHILD_QUERIES: Record<ChildTable, (columns: string, scope: DocumentScope) => string> = {
  classes: (columns, scope) =>
    `SELECT ${columns} FROM classes t JOIN documents d ON d.key = t.document_key WHERE ${visibilityClause(scope)} AND t.parent_id = ? ORDER BY t.name COLLATE NOCASE, t.id`,
  species: (columns, scope) =>
    `SELECT ${columns} FROM species t JOIN documents d ON d.key = t.document_key WHERE ${visibilityClause(scope)} AND t.parent_id = ? ORDER BY t.name COLLATE NOCASE, t.id`,
  // The "parent" of a rule is its chapter, and a chapter's rules read in order, not by name.
  rules: (columns, scope) =>
    `SELECT ${columns} FROM rules t JOIN documents d ON d.key = t.document_key WHERE ${visibilityClause(scope)} AND t.chapter_id = ? ORDER BY t.sort_index, t.id`,
};

/** Every record visible to `scope` of `table` whose parent is `parentId`, with no paging (a class, species or rules chapter has a few dozen children). */
export async function selectChildren<Row>(db: D1Database, scope: DocumentScope, table: ChildTable, columns: string, parentId: string): Promise<Row[]> {
  const sql = CHILD_QUERIES[table];
  if (sql === undefined) throw new Error(`no children query for table "${String(table)}"`);
  const { results } = await db.prepare(sql(columns, scope)).bind(parentId).all<Row>();
  return results;
}

/** Documents visible to `scope`, as JSON rows. */
export async function selectDocuments(db: D1Database, scope: DocumentScope) {
  const [docs, ...counts] = await db.batch([
    db.prepare(`SELECT d.data AS data FROM documents d WHERE ${visibilityClause(scope)} ORDER BY d.display_name COLLATE NOCASE, d.key`),
    ...RULE_TABLES.map((t) => db.prepare(`SELECT t.document_key AS document_key, COUNT(*) AS n FROM ${t} t JOIN documents d ON d.key = t.document_key WHERE ${visibilityClause(scope)} GROUP BY t.document_key`)),
  ]);
  return { docs: docs?.results ?? [], counts };
}

/**
 * Licence texts used by a document visible to `scope`. Private documents list no licences, so they
 * contribute nothing here.
 */
export async function selectLicenses(db: D1Database, scope: DocumentScope) {
  const { results } = await db
    .prepare(
      `SELECT l.key, l.name, l.url, l.text FROM licenses l WHERE EXISTS (
         SELECT 1 FROM documents d, json_each(d.data, '$.licenses') j
         WHERE ${visibilityClause(scope)} AND json_extract(j.value, '$.key') = l.key
       ) ORDER BY l.name COLLATE NOCASE, l.key`,
    )
    .all();
  return results;
}
