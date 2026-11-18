import { describe, expect, it } from "vitest";
import { challengeRatingProficiencyBonus, challengeRatingXp, formatChallengeRating } from "./cr.js";

describe("formatChallengeRating", () => {
  it("prints fractions the way the books do", () => {
    expect(formatChallengeRating(0.125)).toBe("1/8");
    expect(formatChallengeRating(0.25)).toBe("1/4");
    expect(formatChallengeRating(0.5)).toBe("1/2");
  });
  it("prints whole ratings plainly", () => {
    expect(formatChallengeRating(0)).toBe("0");
    expect(formatChallengeRating(24)).toBe("24");
  });
  it("rejects out-of-range values", () => {
    expect(() => formatChallengeRating(-1)).toThrow(RangeError);
    expect(() => formatChallengeRating(31)).toThrow(RangeError);
    expect(() => formatChallengeRating(Number.NaN)).toThrow(RangeError);
  });
});

describe("challengeRatingXp", () => {
  it("matches the SRD table", () => {
    expect(challengeRatingXp(0)).toBe(10);
    expect(challengeRatingXp(0.125)).toBe(25);
    expect(challengeRatingXp(0.25)).toBe(50);
    expect(challengeRatingXp(1)).toBe(200);
    expect(challengeRatingXp(5)).toBe(1800);
    expect(challengeRatingXp(24)).toBe(62000);
    expect(challengeRatingXp(30)).toBe(155000);
  });
  it("tolerates floating point noise", () => {
    expect(challengeRatingXp(0.1 + 0.025)).toBe(25);
    expect(challengeRatingXp(0.25 + 1e-12)).toBe(50);
    expect(formatChallengeRating(0.1 + 0.025)).toBe("1/8");
  });
  it("returns null for non-standard ratings", () => {
    expect(challengeRatingXp(1.5)).toBeNull();
  });
});

describe("challengeRatingProficiencyBonus", () => {
  it("steps up every four ratings", () => {
    const cases: [number, number][] = [
      [0, 2], [0.5, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5],
      [17, 6], [20, 6], [21, 7], [24, 7], [25, 8], [28, 8], [29, 9], [30, 9],
    ];
    for (const [cr, bonus] of cases) expect(challengeRatingProficiencyBonus(cr)).toBe(bonus);
  });
});
