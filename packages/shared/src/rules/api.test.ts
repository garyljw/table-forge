import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MonsterListQuery, SpellListQuery } from "./api.js";
import { RecordId } from "./common.js";

describe("list query parsing", () => {
  it("applies paging defaults", () => {
    expect(SpellListQuery.parse({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it("turns string params into typed values", () => {
    expect(SpellListQuery.parse({ q: " fire ", level: "3", concentration: "true", ritual: "false", class: "wizard", page: "2", pageSize: "50" })).toEqual({
      q: "fire",
      level: 3,
      concentration: true,
      ritual: false,
      class: "wizard",
      page: 2,
      pageSize: 50,
    });
    expect(MonsterListQuery.parse({ crMin: "0.125", crMax: "5" })).toMatchObject({ crMin: 0.125, crMax: 5 });
  });

  it.each([
    { level: "10" },
    { level: "" },
    { level: "1e1" },
    { concentration: "1" },
    { page: "0" },
    { pageSize: String(MAX_PAGE_SIZE + 1) },
    { q: "" },
    { q: "x".repeat(101) },
    { school: "Evo cation" },
    { document: "../etc" },
  ])("rejects %j", (query) => {
    expect(SpellListQuery.safeParse(query).success).toBe(false);
  });
});

describe("RecordId", () => {
  it.each(["srd_fireball", "tob2_aboleth", "srd-2014_blinded"])("accepts %s", (id) => {
    expect(RecordId.safeParse(id).success).toBe(true);
  });
  it.each(["", "Srd_Fireball", "a b", "a/b", "_x", "x".repeat(201)])("rejects %j", (id) => {
    expect(RecordId.safeParse(id).success).toBe(false);
  });
});
