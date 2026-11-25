import { describe, expect, it } from "vitest";
import { checkRollTableRows, dieRange } from "./roll-table.js";

const rows = (...r: [number, number][]) => r.map(([min, max]) => ({ min, max }));

describe("dieRange", () => {
  it.each([
    ["d8", 1, 8],
    ["1d8", 1, 8],
    ["d100", 1, 100],
    ["2d6", 2, 12],
    ["3d4", 3, 12],
  ])("%s covers %i to %i", (dice, min, max) => {
    expect(dieRange(dice)).toEqual({ min, max });
  });
  it.each(["", "d", "8", "d0", "0d6", "d6+1", "2d", "D6", "d12345"])("rejects %j", (dice) => {
    expect(() => dieRange(dice)).toThrow();
  });
});

describe("checkRollTableRows", () => {
  it("accepts rows that cover the die exactly once, in any order", () => {
    expect(checkRollTableRows("d6", rows([1, 1], [2, 3], [4, 6]))).toEqual([]);
    expect(checkRollTableRows("d6", rows([4, 6], [1, 3]))).toEqual([]);
    expect(checkRollTableRows("2d6", rows([2, 6], [7, 7], [8, 12]))).toEqual([]);
    expect(checkRollTableRows("d100", rows([1, 50], [51, 100]))).toEqual([]);
  });
  it("reports a gap at the start, middle and end", () => {
    expect(checkRollTableRows("d6", rows([2, 6]))).toEqual(["no row for roll 1"]);
    expect(checkRollTableRows("d6", rows([1, 2], [5, 6]))).toEqual(["no row for rolls 3-4"]);
    expect(checkRollTableRows("d8", rows([1, 6]))).toEqual(["no row for rolls 7-8"]);
    expect(checkRollTableRows("d6", [])).toEqual(["no row for rolls 1-6"]);
  });
  it("reports overlapping rows", () => {
    const problems = checkRollTableRows("d6", rows([1, 3], [3, 6]));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("row 3-6 overlaps");
    expect(checkRollTableRows("d6", rows([1, 6], [4, 4]))[0]).toContain("row 4 overlaps");
    expect(checkRollTableRows("d6", rows([1, 6], [1, 6]))[0]).toContain("overlaps");
  });
  it("reports rows outside the die", () => {
    expect(checkRollTableRows("d6", rows([1, 7]))).toEqual(["row 1-7 is outside d6 (1-6)"]);
    expect(checkRollTableRows("2d6", rows([1, 12]))[0]).toContain("outside 2d6 (2-12)");
    expect(checkRollTableRows("d6", rows([0, 0], [1, 6]))[0]).toContain("row 0 is outside");
  });
  it("reports a row whose min is greater than its max, and a bad die", () => {
    expect(checkRollTableRows("d6", rows([4, 2], [1, 6]))).toEqual(["row 4-2: min is greater than max"]);
    expect(checkRollTableRows("banana", rows([1, 6]))).toEqual(['not a die: "banana"']);
  });
});
