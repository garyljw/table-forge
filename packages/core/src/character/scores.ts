import { ABILITIES, type Ability, type AbilityScores, type RolledSet } from "@table-forge/shared";

export interface ScoreCheck {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];

/** Each standard-array value must be used exactly once. */
export function validateStandardArray(scores: AbilityScores): ScoreCheck {
  const errors: string[] = [];
  const remaining = [...STANDARD_ARRAY];
  for (const a of ABILITIES) {
    const i = remaining.indexOf(scores[a]);
    if (i === -1) errors.push(`${a.toUpperCase()} ${String(scores[a])} is not an unused standard array value (${STANDARD_ARRAY.join(", ")})`);
    else remaining.splice(i, 1);
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

export const POINT_BUY_BUDGET = 27;
const POINT_BUY_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** PHB point-buy cost of one score; null when the score is outside 8-15. */
export function pointBuyCost(score: number): number | null {
  return POINT_BUY_COSTS[score] ?? null;
}

export interface PointBuyCheck extends ScoreCheck {
  spent: number;
  remaining: number;
}

export function validatePointBuy(scores: AbilityScores): PointBuyCheck {
  const errors: string[] = [];
  let spent = 0;
  for (const a of ABILITIES) {
    const cost = pointBuyCost(scores[a]);
    if (cost === null) errors.push(`${a.toUpperCase()} ${String(scores[a])} is outside the point-buy range of 8 to 15`);
    else spent += cost;
  }
  const remaining = POINT_BUY_BUDGET - spent;
  if (errors.length === 0 && remaining < 0) errors.push(`Point buy is ${String(-remaining)} point(s) over the budget of ${String(POINT_BUY_BUDGET)}`);
  return { valid: errors.length === 0, errors, warnings: [], spent, remaining };
}

/** Sum of the kept dice. */
export function rolledTotal(set: RolledSet): number {
  return set.dice.reduce((a, b) => a + b, 0) - (set.dice[set.droppedIndex] ?? 0);
}

/**
 * Roll six sets of 4d6, dropping the lowest die of each (the first lowest, on a tie).
 * `randomInt(6)` must return an integer from 0 to 5. Randomness is injected so core stays pure.
 */
export function rollAbilityScores(randomInt: (maxExclusive: number) => number): RolledSet[] {
  const sets: RolledSet[] = [];
  for (let s = 0; s < 6; s++) {
    const d = (): number => randomInt(6) + 1;
    const dice: RolledSet["dice"] = [d(), d(), d(), d()];
    let droppedIndex = 0;
    for (let i = 1; i < 4; i++) if (dice[i]! < dice[droppedIndex]!) droppedIndex = i;
    sets.push({ dice, droppedIndex });
  }
  return sets;
}

/**
 * The assigned scores must be exactly the totals of the six rolls, in some order, and each dropped die
 * must be the lowest of its four. The dice values themselves are self-reported by the client and
 * cannot be verified here.
 */
export function validateRolled(scores: AbilityScores, rolls: readonly RolledSet[]): ScoreCheck {
  const errors: string[] = [];
  rolls.forEach((r, i) => {
    if (r.dice[r.droppedIndex] !== Math.min(...r.dice)) errors.push(`Roll ${String(i + 1)} did not drop its lowest die`);
  });
  const remaining = rolls.map(rolledTotal);
  for (const a of ABILITIES) {
    const i = remaining.indexOf(scores[a]);
    if (i === -1) errors.push(`${a.toUpperCase()} ${String(scores[a])} does not match an unused roll`);
    else remaining.splice(i, 1);
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

/** Manual entry: 1-20 allowed; outside the usual 3-18 gives a warning. */
export function validateManual(scores: AbilityScores): ScoreCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const a of ABILITIES) {
    const v = scores[a];
    if (!Number.isInteger(v) || v < 1 || v > 20) errors.push(`${a.toUpperCase()} ${String(v)} must be a whole number from 1 to 20`);
    else if (v < 3 || v > 18) warnings.push(`${a.toUpperCase()} ${String(v)} is outside the usual 3 to 18`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

export const DEFAULT_SPELLCASTING_ABILITY: Readonly<Record<string, Ability>> = {
  bard: "cha",
  sorcerer: "cha",
  warlock: "cha",
  paladin: "cha",
  cleric: "wis",
  druid: "wis",
  ranger: "wis",
  wizard: "int",
};
