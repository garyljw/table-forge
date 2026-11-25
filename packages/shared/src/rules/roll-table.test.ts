import { describe, expect, it } from "vitest";
import { RollTableListQuery } from "./api.js";
import { DiceNotation, RollTable } from "./roll-table.js";

const table = {
  id: "test_trinkets",
  documentKey: "test-doc",
  name: "Test Trinkets",
  category: "trinket",
  dice: "d4",
  description: null,
  columns: ["Trinket"],
  rows: [
    { min: 1, max: 2, cells: ["A spoon"] },
    { min: 3, max: 4, cells: ["A feather"] },
  ],
};

describe("RollTable", () => {
  it("accepts a valid table and defaults dmOnly to false", () => {
    expect(RollTable.parse(table)).toEqual({ ...table, dmOnly: false });
  });
  it("rejects a row with the wrong number of cells", () => {
    const bad = { ...table, rows: [{ min: 1, max: 4, cells: ["a", "b"] }] };
    const r = RollTable.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["rows", 0, "cells"]);
  });
  it.each([
    { rows: [] },
    { columns: [] },
    { category: "loot" },
    { dice: "d" },
    { rows: [{ min: 3, max: 1, cells: ["x"] }] },
  ])("rejects %j", (patch) => {
    expect(RollTable.safeParse({ ...table, ...patch }).success).toBe(false);
  });
  it("does not check coverage: that is packages/core's checkRollTableRows", () => {
    expect(RollTable.safeParse({ ...table, rows: [{ min: 1, max: 1, cells: ["x"] }] }).success).toBe(true);
  });
});

describe("DiceNotation", () => {
  it.each(["d4", "d100", "2d6", "1d8", "10d6"])("accepts %s", (d) => expect(DiceNotation.safeParse(d).success).toBe(true));
  it.each(["", "d0", "0d6", "d", "2d", "d6+1", "D6", "100d6"])("rejects %j", (d) => expect(DiceNotation.safeParse(d).success).toBe(false));
});

describe("RollTableListQuery", () => {
  it("parses a category and rejects an unknown one", () => {
    expect(RollTableListQuery.parse({ category: "madness" }).category).toBe("madness");
    expect(RollTableListQuery.safeParse({ category: "bogus" }).success).toBe(false);
  });
});
