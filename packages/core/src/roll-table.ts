/**
 * Roll table arithmetic: which rolls a die can produce, and whether a table's rows cover them
 * exactly once. Pure, no platform APIs. The Zod schema in packages/shared checks only the shape of
 * a table; this is the check that the rows make sense for the die.
 */

export interface DieRange {
  min: number;
  max: number;
}

/** The lowest and highest roll of `d8`, `d100` or `2d6` (`1d8` is the same as `d8`). Throws on anything else. */
export function dieRange(dice: string): DieRange {
  const m = /^(\d{1,2})?d(\d{1,4})$/.exec(dice);
  if (!m) throw new Error(`not a die: "${dice}"`);
  const count = m[1] === undefined ? 1 : Number(m[1]);
  const sides = Number(m[2]);
  if (count < 1 || sides < 1) throw new Error(`not a die: "${dice}"`);
  return { min: count, max: count * sides };
}

export interface RollRowRange {
  min: number;
  max: number;
}

/**
 * Problems with a table's rows, as readable messages; an empty list means the rows lie within the
 * die's range, do not overlap, leave no roll uncovered and each have `min <= max`. Rows may be in any order.
 */
export function checkRollTableRows(dice: string, rows: readonly RollRowRange[]): string[] {
  let range: DieRange;
  try {
    range = dieRange(dice);
  } catch (err) {
    return [err instanceof Error ? err.message : String(err)];
  }
  const problems: string[] = [];
  const sorted: RollRowRange[] = [];
  for (const row of rows) {
    if (row.min > row.max) {
      problems.push(`row ${row.min}-${row.max}: min is greater than max`);
      continue;
    }
    if (row.min < range.min || row.max > range.max) {
      problems.push(`row ${label(row)} is outside ${dice} (${range.min}-${range.max})`);
    }
    sorted.push(row);
  }
  sorted.sort((a, b) => a.min - b.min || a.max - b.max);
  // Walk the rows in order: `next` is the lowest roll not yet covered.
  let next = range.min;
  for (const row of sorted) {
    if (row.min < next) problems.push(`row ${label(row)} overlaps the row before it (covered up to ${next - 1})`);
    else if (row.min > next) problems.push(`no row for ${gap(next, row.min - 1)}`);
    next = Math.max(next, row.max + 1);
  }
  if (next <= range.max) problems.push(`no row for ${gap(next, range.max)}`);
  return problems;
}

const label = (r: RollRowRange): string => (r.min === r.max ? String(r.min) : `${r.min}-${r.max}`);
const gap = (from: number, to: number): string => (from === to ? `roll ${from}` : `rolls ${from}-${to}`);
