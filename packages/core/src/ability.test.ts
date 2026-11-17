import { describe, expect, it } from "vitest";
import { abilityModifier } from "./ability.js";

describe("abilityModifier", () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
    [30, 10],
  ])("score %i gives modifier %i", (score, mod) => {
    expect(abilityModifier(score)).toBe(mod);
  });

  it.each([0, 31, 10.5, Number.NaN, -3])("rejects %s", (score) => {
    expect(() => abilityModifier(score)).toThrow(RangeError);
  });
});
