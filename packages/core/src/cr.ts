/** Experience points by challenge rating (SRD 5.1). Fractions are keyed by their decimal value. */
const XP_BY_CR: Readonly<Record<string, number>> = {
  "0": 10,
  "0.125": 25,
  "0.25": 50,
  "0.5": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

const EPSILON = 1e-9;
const near = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON;

/**
 * 30 is the highest standard challenge rating (the Tarrasque is 30, and the XP and proficiency
 * tables stop there), so these helpers reject anything else. Callers showing third-party data
 * should catch the error and display the raw value.
 */
function assertCr(cr: number): void {
  if (!Number.isFinite(cr) || cr < 0 || cr > 30) {
    throw new RangeError(`Challenge rating must be from 0 to 30, got ${String(cr)}`);
  }
}

/** Format a challenge rating the way the books print it: 0.125 becomes "1/8", 0.25 "1/4", 0.5 "1/2". */
export function formatChallengeRating(cr: number): string {
  assertCr(cr);
  if (near(cr, 0.125)) return "1/8";
  if (near(cr, 0.25)) return "1/4";
  if (near(cr, 0.5)) return "1/2";
  return String(cr);
}

/** XP for a challenge rating, or null when it is not one of the standard ratings. */
export function challengeRatingXp(cr: number): number | null {
  assertCr(cr);
  for (const [key, xp] of Object.entries(XP_BY_CR)) if (near(Number(key), cr)) return xp;
  return null;
}

/** Proficiency bonus for a challenge rating: +2 up to CR 4, then +1 for every four ratings, to +9 at CR 29. */
export function challengeRatingProficiencyBonus(cr: number): number {
  assertCr(cr);
  return 2 + Math.max(0, Math.ceil(cr / 4) - 1);
}
