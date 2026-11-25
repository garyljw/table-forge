import type { AbilityScores, ClassTableColumn, RolledSet } from "@table-forge/shared";
import { describe, expect, it } from "vitest";
import { describeEffect, effectsBySource } from "./effects.js";
import { grant, src } from "./fixtures.js";
import { pointBuyCost, rollAbilityScores, rolledTotal, spellSlotsForLevel, validateManual, validatePointBuy, validateRolled, validateStandardArray } from "./index.js";

const sc = (str: number, dex: number, con: number, int: number, wis: number, cha: number): AbilityScores => ({ str, dex, con, int, wis, cha });

describe("standard array", () => {
  it("accepts each value once, in any order", () => {
    expect(validateStandardArray(sc(8, 10, 12, 13, 14, 15)).valid).toBe(true);
    expect(validateStandardArray(sc(15, 14, 13, 12, 10, 8)).valid).toBe(true);
  });
  it("rejects repeats and other values", () => {
    expect(validateStandardArray(sc(15, 15, 13, 12, 10, 8)).valid).toBe(false);
    expect(validateStandardArray(sc(16, 14, 13, 12, 10, 8)).valid).toBe(false);
  });
});

describe("point buy", () => {
  it("has PHB costs", () => {
    expect([8, 9, 10, 11, 12, 13, 14, 15].map(pointBuyCost)).toEqual([0, 1, 2, 3, 4, 5, 7, 9]);
    expect(pointBuyCost(7)).toBeNull();
    expect(pointBuyCost(16)).toBeNull();
  });
  it("accepts exactly 27 points", () => {
    const r = validatePointBuy(sc(15, 15, 15, 8, 8, 8));
    expect(r).toMatchObject({ valid: true, spent: 27, remaining: 0 });
  });
  it("reports remaining points when under budget", () => {
    expect(validatePointBuy(sc(8, 8, 8, 8, 8, 8))).toMatchObject({ valid: true, spent: 0, remaining: 27 });
  });
  it("rejects over budget and out of range", () => {
    expect(validatePointBuy(sc(15, 15, 15, 15, 8, 8))).toMatchObject({ valid: false, remaining: -9 });
    expect(validatePointBuy(sc(16, 8, 8, 8, 8, 8)).valid).toBe(false);
    expect(validatePointBuy(sc(7, 8, 8, 8, 8, 8)).valid).toBe(false);
  });
});

describe("rolling", () => {
  it("rolls 4d6 six times and drops the lowest die", () => {
    const seq = [
      [5, 0, 5, 2], // dice 6,1,6,3 -> drop idx1, total 15
      [2, 2, 2, 2], // 3,3,3,3 -> drop idx0 (first lowest), total 9
      [5, 5, 5, 5],
      [0, 0, 0, 0],
      [0, 1, 2, 3],
      [3, 2, 1, 0], // 4,3,2,1 -> drop idx3, total 9
    ].flat();
    let i = 0;
    const out = rollAbilityScores((max) => {
      expect(max).toBe(6);
      return seq[i++]!;
    });
    expect(out).toHaveLength(6);
    expect(out[0]).toEqual({ dice: [6, 1, 6, 3], droppedIndex: 1 });
    expect(out.map(rolledTotal)).toEqual([15, 9, 18, 3, 9, 9]);
    expect(out[1]?.droppedIndex).toBe(0);
    expect(out[5]?.droppedIndex).toBe(3);
  });
  it("rejects a roll that did not drop its lowest die", () => {
    const rolls: RolledSet[] = [
      { dice: [6, 1, 6, 3], droppedIndex: 0 },
      ...Array.from({ length: 5 }, (): RolledSet => ({ dice: [3, 3, 3, 3], droppedIndex: 0 })),
    ];
    const r = validateRolled(sc(12, 9, 9, 9, 9, 9), rolls);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("lowest die"))).toBe(true);
  });
  it("validates assigned scores against the rolls", () => {
    const rolls: RolledSet[] = [
      { dice: [6, 1, 6, 3], droppedIndex: 1 },
      { dice: [3, 3, 3, 3], droppedIndex: 0 },
      { dice: [6, 6, 6, 6], droppedIndex: 0 },
      { dice: [1, 1, 1, 1], droppedIndex: 0 },
      { dice: [1, 2, 3, 4], droppedIndex: 0 },
      { dice: [4, 3, 2, 1], droppedIndex: 3 },
    ];
    expect(validateRolled(sc(15, 9, 18, 3, 9, 9), rolls).valid).toBe(true);
    expect(validateRolled(sc(15, 9, 18, 3, 9, 10), rolls).valid).toBe(false);
  });
});

describe("manual", () => {
  it("allows 1-20, warning outside 3-18", () => {
    expect(validateManual(sc(10, 10, 10, 10, 10, 10))).toMatchObject({ valid: true, warnings: [] });
    const r = validateManual(sc(20, 2, 10, 10, 10, 10));
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(2);
    expect(validateManual(sc(21, 10, 10, 10, 10, 10)).valid).toBe(false);
    expect(validateManual(sc(0, 10, 10, 10, 10, 10)).valid).toBe(false);
  });
});

describe("effects", () => {
  const dragonborn = src("race", "Dragonborn");
  it("groups grants by source in first-seen order", () => {
    const g = [
      grant(dragonborn, { type: "abilityBonus", ability: "str", amount: 2 }),
      grant(src("class", "Fighter"), { type: "darkvision", feet: 0 }),
      grant(dragonborn, { type: "abilityBonus", ability: "cha", amount: 1 }),
    ];
    const groups = effectsBySource(g);
    expect(groups.map((x) => [x.source.name, x.grants.length])).toEqual([["Dragonborn", 2], ["Fighter", 1]]);
  });
  it("describes effects", () => {
    expect(describeEffect({ type: "abilityBonus", ability: "str", amount: 2 })).toBe("+2 Strength");
    expect(describeEffect({ type: "proficiency", category: "skill", key: "stealth" })).toBe("Proficiency: Stealth");
    expect(describeEffect({ type: "proficiency", category: "weapon", key: "martial" })).toBe("Proficiency: Martial weapons");
    expect(describeEffect({ type: "darkvision", feet: 60 })).toBe("Darkvision 60 ft");
    expect(describeEffect({ type: "speed", feet: 25 })).toBe("Speed 25 ft");
    expect(describeEffect({ type: "hpBonusPerLevel", amount: 1 })).toBe("+1 HP per level");
    expect(describeEffect({ type: "resistance", damageType: "fire" })).toBe("Resistance to fire damage");
    expect(describeEffect({ type: "unarmoredDefense", abilities: ["con"], shieldAllowed: true })).toBe("Unarmored Defense (10 + Dex + Con)");
    expect(describeEffect({ type: "expertise", skill: "sleightOfHand" })).toBe("Expertise: Sleight of Hand");
  });
});

describe("spellSlotsForLevel", () => {
  it("reads Open5e slot columns, treating dashes as none", () => {
    const table = [
      { name: "1st", kind: "spellSlots" as const, values: { "1": "2", "5": "4" } },
      { name: "3rd", kind: "spellSlots" as const, values: { "1": "-", "5": "2" } },
    ];
    expect(spellSlotsForLevel(table, 1)).toEqual({ slots: [{ level: 1, total: 2 }], found: true });
    expect(spellSlotsForLevel(table, 5).slots).toEqual([{ level: 1, total: 4 }, { level: 3, total: 2 }]);
  });
  it("reads warlock pact magic", () => {
    const table = [
      { name: "Spell Slots", kind: "other" as const, values: { "1": "1", "5": "2" } },
      { name: "Slot Level", kind: "other" as const, values: { "1": "1st", "5": "3rd" } },
    ];
    expect(spellSlotsForLevel(table, 5)).toEqual({ slots: [{ level: 3, total: 2 }], found: true });
  });
  it("derives warlock slot level from the SRD progression when there is no Slot Level column", () => {
    const table: ClassTableColumn[] = [
      { name: "Proficiency Bonus", kind: "proficiencyBonus" as const, values: { "1": "+2" } },
      { name: "Spell Slots", kind: "other" as const, values: { "1": "1", "2": "2", "3": "2", "11": "3", "20": "4" } },
    ];
    expect(spellSlotsForLevel(table, 1).slots).toEqual([{ level: 1, total: 1 }]);
    expect(spellSlotsForLevel(table, 3).slots).toEqual([{ level: 2, total: 2 }]);
    expect(spellSlotsForLevel(table, 11).slots).toEqual([{ level: 5, total: 3 }]);
    expect(spellSlotsForLevel(table, 20)).toEqual({ slots: [{ level: 5, total: 4 }], found: true });
  });
  it("reports found = false with no usable columns", () => {
    expect(spellSlotsForLevel([], 1)).toEqual({ slots: [], found: false });
  });
});
