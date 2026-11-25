/** Proficiency bonus by character level: +2 at 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20. */
export function proficiencyBonusForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new RangeError(`Level must be an integer from 1 to 20, got ${String(level)}`);
  }
  return Math.ceil(level / 4) + 1;
}
