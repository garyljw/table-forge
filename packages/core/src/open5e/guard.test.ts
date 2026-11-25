import type { RuleTable } from "@table-forge/shared";
import { describe, expect, it } from "vitest";
import { checkImport, type TypeResult } from "./guard.js";

const ok = (valid: number, failed = 0): TypeResult => ({ fetched: valid + failed, valid, failed });
const results = (over: Partial<Record<RuleTable, TypeResult>> = {}): Record<RuleTable, TypeResult> => ({
  spells: ok(100),
  monsters: ok(100),
  classes: ok(10),
  conditions: ok(15),
  species: ok(13),
  backgrounds: ok(1),
  feats: ok(1),
  weapons: ok(37),
  armor: ok(12),
  magic_items: ok(1500),
  roll_tables: ok(0),
  ...over,
});

describe("checkImport", () => {
  it("passes a healthy import", () => {
    expect(checkImport(results(), { spells: 100, monsters: 100, classes: 10, conditions: 15 })).toEqual([]);
    expect(checkImport(results(), null)).toEqual([]);
  });

  it("allows a type that had nothing at all", () => {
    expect(checkImport(results({ conditions: { fetched: 0, valid: 0, failed: 0 } }), null)).toEqual([]);
  });

  it("stops when every type is empty", () => {
    const none = { fetched: 0, valid: 0, failed: 0 };
    const problems = checkImport({ spells: none, monsters: none, classes: none, conditions: none, species: none, backgrounds: none, feats: none, weapons: none, armor: none, magic_items: none, roll_tables: none }, null);
    expect(problems).toEqual(["no valid records of any type"]);
  });

  it("still catches a type that came back empty when the database has rows for it", () => {
    const empty = results({ spells: { fetched: 0, valid: 0, failed: 0 } });
    expect(checkImport(empty, { spells: 50 })[0]).toContain("spells: 0 valid records");
    expect(checkImport(empty, { spells: 0 })).toEqual([]);
    expect(checkImport(empty, { spells: 50 }, { maxFailureRate: 0.05, maxDropRate: 0.2, force: true })).toEqual([]);
  });

  it("stops when every record failed validation", () => {
    expect(checkImport(results({ monsters: { fetched: 50, valid: 0, failed: 50 } }), null)[0]).toContain("monsters: no valid records");
  });

  it("stops when more than 5% fail, but allows exactly 5%", () => {
    expect(checkImport(results({ spells: ok(94, 6) }), null)[0]).toContain("6 of 100 records failed validation");
    expect(checkImport(results({ spells: ok(95, 5) }), null)).toEqual([]);
  });

  it("stops when a type falls more than 20% below the database, unless forced", () => {
    const existing = { spells: 200 };
    expect(checkImport(results({ spells: ok(100) }), existing)[0]).toContain("below the 200 in the database");
    expect(checkImport(results({ spells: ok(160) }), existing)).toEqual([]);
    expect(checkImport(results({ spells: ok(100) }), existing, { maxFailureRate: 0.05, maxDropRate: 0.2, force: true })).toEqual([]);
  });

  it("does not let --force excuse an empty or mostly failed type", () => {
    const forced = { maxFailureRate: 0.05, maxDropRate: 0.2, force: true };
    expect(checkImport(results({ spells: ok(0, 10) }), { spells: 5 }, forced)[0]).toContain("spells: no valid records");
  });

  it("reports every problem", () => {
    expect(checkImport(results({ spells: ok(0, 3), classes: ok(1, 9) }), null)).toHaveLength(2);
  });
});
