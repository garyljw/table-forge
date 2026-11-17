/** D&D 5e ability modifier: floor((score - 10) / 2). Scores run from 1 to 30. */
export function abilityModifier(score: number): number {
  if (!Number.isInteger(score) || score < 1 || score > 30) {
    throw new RangeError(`Ability score must be an integer from 1 to 30, got ${String(score)}`);
  }
  return Math.floor((score - 10) / 2);
}
