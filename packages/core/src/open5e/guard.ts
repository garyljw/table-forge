import type { RuleTable } from "@table-forge/shared";

/** How one record type fared in an import: records fetched, valid, and failed validation. */
export interface TypeResult {
  fetched: number;
  valid: number;
  failed: number;
}

export interface GuardOptions {
  /** Largest share of fetched records allowed to fail validation. */
  maxFailureRate: number;
  /** Largest allowed fall in valid records, as a share of what the database holds now. */
  maxDropRate: number;
  /** Skips the comparison with the database (a deliberate big change in Open5e's data). */
  force: boolean;
}

export const DEFAULT_GUARD: GuardOptions = { maxFailureRate: 0.05, maxDropRate: 0.2, force: false };

/**
 * Decides whether an import's results are fit to replace the current data. The stale-row
 * deletes remove everything Open5e did not return, so an import that fetched nothing or
 * failed validation wholesale (Open5e changed a field, a page came back empty) must stop
 * before any SQL is written. A type with nothing fetched and nothing valid is allowed, unless
 * every type is empty. Returns the reasons it must stop; an empty list means go ahead.
 *
 * `existing` is the number of Open5e rows now in the database per type, or null when it is
 * not known (a SQL-file-only run).
 */
export function checkImport(
  results: Record<RuleTable, TypeResult>,
  existing: Partial<Record<RuleTable, number>> | null,
  options: GuardOptions = DEFAULT_GUARD,
): string[] {
  const problems: string[] = [];
  const entries = Object.entries(results) as [RuleTable, TypeResult][];
  // A type can legitimately have nothing (the included documents may supply no conditions),
  // but an import where every type is empty means the fetch itself failed.
  if (entries.every(([, r]) => r.valid === 0)) problems.push("no valid records of any type");
  for (const [type, r] of entries) {
    if (r.valid === 0) {
      // Records came back but none passed validation: the data changed shape.
      if (r.fetched > 0) {
        problems.push(`${type}: no valid records (${r.fetched} fetched, ${r.failed} failed)`);
        continue;
      }
    }
    const rate = r.fetched === 0 ? 0 : r.failed / r.fetched;
    if (rate > options.maxFailureRate) {
      problems.push(`${type}: ${r.failed} of ${r.fetched} records failed validation (${(rate * 100).toFixed(1)}%, limit ${options.maxFailureRate * 100}%)`);
    }
    const now = existing?.[type];
    if (!options.force && now !== undefined && now > 0 && r.valid < now * (1 - options.maxDropRate)) {
      problems.push(`${type}: ${r.valid} valid records is more than ${options.maxDropRate * 100}% below the ${now} in the database (use --force if that is expected)`);
    }
  }
  return problems;
}
