import { foldName } from "@table-forge/core";
import type { RuleTable } from "@table-forge/shared";

/**
 * Query building for the rules tables. Every value reaches SQL as a bound parameter;
 * the only text spliced into a statement is column and table names written in this
 * codebase.
 */

/**
 * Collects `WHERE` conditions and their bound values. `t` is the record table and `d`
 * the `documents` table it is joined to. Only documents marked public are ever served
 * here; private data would need its own routes with their own access check.
 */
export class Where {
  private readonly clauses: string[] = ["d.visibility = 'public'"];
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

  get sql(): string {
    return this.clauses.join(" AND ");
  }
}

export interface Page<Row> {
  rows: Row[];
  total: number;
}

/** One page of rows plus the total count, in a single D1 round trip. */
export async function selectPage<Row>(
  db: D1Database,
  table: RuleTable,
  columns: string,
  where: Where,
  page: number,
  pageSize: number,
): Promise<Page<Row>> {
  const from = `FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE ${where.sql}`;
  const [count, rows] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...where.params),
    db
      .prepare(`SELECT ${columns} ${from} ORDER BY t.name COLLATE NOCASE, t.id LIMIT ? OFFSET ?`)
      .bind(...where.params, pageSize, (page - 1) * pageSize),
  ]);
  return { rows: (rows?.results ?? []) as Row[], total: Number((count?.results[0] as { n: number } | undefined)?.n ?? 0) };
}

export function pageEnvelope<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

/** A record's JSON and its document's JSON, or null when the id is unknown or not public. */
export async function selectDetail(
  db: D1Database,
  table: RuleTable,
  id: string,
): Promise<{ data: unknown; document: unknown } | null> {
  const row = await db
    .prepare(
      `SELECT t.data AS data, d.data AS document FROM ${table} t JOIN documents d ON d.key = t.document_key WHERE t.id = ? AND d.visibility = 'public'`,
    )
    .bind(id)
    .first<{ data: string; document: string }>();
  return row ? { data: JSON.parse(row.data), document: JSON.parse(row.document) } : null;
}

/** Every public class whose parent is `parentId`, with no paging (a class has a few dozen subclasses). */
export async function selectChildClasses<Row>(db: D1Database, columns: string, parentId: string): Promise<Row[]> {
  const { results } = await db
    .prepare(
      `SELECT ${columns} FROM classes t JOIN documents d ON d.key = t.document_key WHERE d.visibility = 'public' AND t.parent_id = ? ORDER BY t.name COLLATE NOCASE, t.id`,
    )
    .bind(parentId)
    .all<Row>();
  return results;
}
