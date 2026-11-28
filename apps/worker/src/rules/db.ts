import { foldName } from "@table-forge/core";
import { BOOK_REPLACES_SRD, CORE_RULES_DOCUMENT_KEYS, RULE_TABLES, SRD_DOCUMENT_KEY, type RuleTable } from "@table-forge/shared";

/**
 * Query building for the rules tables. Every value reaches SQL as a bound parameter;
 * the only text spliced into a statement is column and table names written in this
 * codebase.
 */

/**
 * Which documents a request may read. Built only by `documentScopeFor` (permissions.ts), from the
 * caller's identity, so a route cannot widen it by accident. Every query in this file takes one.
 *
 * `email` is the caller's normalised email when they are a verified user, else null (public documents only).
 * Which private books that email owns is decided in SQL, by `visibilityClause`.
 */
export interface DocumentScope {
  readonly email: string | null;
}

/** A fragment of SQL with its bound values, in placeholder order. The text is fixed; request-derived values are only ever in `params`. */
export interface Clause {
  readonly sql: string;
  readonly params: readonly string[];
}

/**
 * THE one place the document visibility rule is written as SQL. `alias` is the `documents` table alias
 * (default `d`). Public documents are always readable; a private document (the owner's transcribed book)
 * only when `book_owners` has a row for its key and the caller's email. The email is a bound parameter.
 * With no email (not a verified user) the result is exactly the public-only rule.
 */
export function visibilityClause(scope: DocumentScope, alias = "d"): Clause {
  if (scope.email === null) return { sql: `${alias}.visibility = 'public'`, params: [] };
  return {
    sql: `(${alias}.visibility = 'public' OR (${alias}.visibility = 'private' AND EXISTS (SELECT 1 FROM book_owners o WHERE o.document_key = ${alias}.key AND o.email = ?)))`,
    params: [scope.email],
  };
}

/**
 * THE one place the whole-book SRD masking rule is written as SQL. A record `t` of `table`, whose document is `d`
 * (the caller must join `documents d`), is hidden when ALL of these hold: `d.key` is the SRD document; the caller
 * is a verified user; and the caller owns (a `book_owners` row) a private book that `BOOK_REPLACES_SRD` says
 * replaces this table. The owned book must be `visibility = 'private'`, so a tick for a public document grants nothing.
 * Returns null (no condition at all) when there is no email or no book replaces `table`. Every key and the email are
 * bound parameters; `table` is not used in the SQL.
 */
export function maskingClause(scope: DocumentScope, table: RuleTable): Clause | null {
  if (scope.email === null) return null;
  const books = Object.entries(BOOK_REPLACES_SRD)
    .filter(([, tables]) => tables.includes(table))
    .map(([key]) => key);
  if (books.length === 0) return null;
  return {
    sql: `NOT (d.key = ? AND EXISTS (SELECT 1 FROM book_owners bo JOIN documents bd ON bd.key = bo.document_key WHERE bo.email = ? AND bd.visibility = 'private' AND bo.document_key IN (${books.map(() => "?").join(", ")})))`,
    params: [SRD_DOCUMENT_KEY, scope.email, ...books],
  };
}

/**
 * Collects `WHERE` conditions and their bound values. `t` is the record table and `d`
 * the `documents` table it is joined to. The first condition is always the visibility
 * clause for the caller's scope, and it cannot be removed.
 */
export class Where {
  private readonly clauses: string[];
  readonly params: (string | number)[];
  constructor(readonly scope: DocumentScope) {
    const vis = visibilityClause(scope);
    this.clauses = [vis.sql];
    this.params = [...vis.params];
  }

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
  const mask = maskingClause(where.scope, table);
  const from = `FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE ${where.sql}${mask ? ` AND ${mask.sql}` : ""}`;
  const params = [...where.params, ...(mask?.params ?? [])];
  const [count, rows] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...params),
    db
      .prepare(`SELECT ${columns} ${from} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...params, pageSize, (page - 1) * pageSize),
  ]);
  return { rows: (rows?.results ?? []) as Row[], total: Number((count?.results[0] as { n: number } | undefined)?.n ?? 0) };
}

export function pageEnvelope<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

/**
 * A record's JSON and its document's JSON, or null when the id is unknown or its document is not visible to `scope`.
 * Detail is intentionally NOT masked: an SRD record opened by id still returns, so old links keep working
 * (SRD content is public anyway). Only lists, children and counts apply `maskingClause`.
 */
export async function selectDetail(
  db: D1Database,
  scope: DocumentScope,
  table: RuleTable,
  id: string,
): Promise<{ data: unknown; document: unknown } | null> {
  const vis = visibilityClause(scope);
  const row = await db
    .prepare(`SELECT t.data AS data, d.data AS document FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE t.id = ? AND ${vis.sql}`)
    .bind(id, ...vis.params)
    .first<{ data: string; document: string }>();
  if (!row) return null;
  return { data: JSON.parse(row.data), document: JSON.parse(row.document) };
}

export type ChildTable = "classes" | "species" | "rules";

/** Fixed filter and order per child table: the table name is never taken from the caller. */
const CHILD_QUERIES: Record<ChildTable, { column: string; order: string }> = {
  classes: { column: "t.parent_id", order: "t.name COLLATE NOCASE, t.id" },
  species: { column: "t.parent_id", order: "t.name COLLATE NOCASE, t.id" },
  // The "parent" of a rule is its chapter, and a chapter's rules read in order, not by name.
  rules: { column: "t.chapter_id", order: "t.sort_index, t.id" },
};

/**
 * Every record visible to `scope` (visibility and masking both applied to each child) of `table` whose parent is
 * `parentId`, with no paging (a class, species or rules chapter has a few dozen children). `columns` is written in this codebase.
 */
export async function selectChildren<Row>(db: D1Database, scope: DocumentScope, table: ChildTable, columns: string, parentId: string): Promise<Row[]> {
  const q = CHILD_QUERIES[table];
  if (q === undefined) throw new Error(`no children query for table "${String(table)}"`);
  const vis = visibilityClause(scope);
  const mask = maskingClause(scope, table);
  const { results } = await db
    .prepare(`SELECT ${columns} FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE ${vis.sql}${mask ? ` AND ${mask.sql}` : ""} AND ${q.column} = ? ORDER BY ${q.order}`)
    .bind(...vis.params, ...(mask?.params ?? []), parentId)
    .all<Row>();
  return results;
}

/** Documents visible to `scope`, as JSON rows, with per-table record counts that follow the same visibility and masking rules as the lists. */
export async function selectDocuments(db: D1Database, scope: DocumentScope) {
  const vis = visibilityClause(scope);
  const [docs, ...counts] = await db.batch([
    db.prepare(`SELECT d.data AS data FROM documents d WHERE ${vis.sql} ORDER BY d.display_name COLLATE NOCASE, d.key`).bind(...vis.params),
    ...RULE_TABLES.map((t) => {
      const mask = maskingClause(scope, t);
      return db
        .prepare(`SELECT t.document_key AS document_key, COUNT(*) AS n FROM ${t} t JOIN documents d ON d.key = t.document_key WHERE ${vis.sql}${mask ? ` AND ${mask.sql}` : ""} GROUP BY t.document_key`)
        .bind(...vis.params, ...(mask?.params ?? []));
    }),
  ]);
  return { docs: docs?.results ?? [], counts };
}

/**
 * Licence texts used by a document visible to `scope`. Private documents list no licences, so they
 * contribute nothing here.
 */
export async function selectLicenses(db: D1Database, scope: DocumentScope) {
  const vis = visibilityClause(scope);
  const { results } = await db
    .prepare(
      `SELECT l.key, l.name, l.url, l.text FROM licenses l WHERE EXISTS (
         SELECT 1 FROM documents d, json_each(d.data, '$.licenses') j
         WHERE ${vis.sql} AND json_extract(j.value, '$.key') = l.key
       ) ORDER BY l.name COLLATE NOCASE, l.key`,
    )
    .bind(...vis.params)
    .all();
  return results;
}
