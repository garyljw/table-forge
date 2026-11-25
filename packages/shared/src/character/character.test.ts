import { describe, expect, it } from "vitest";
import { CharacterData, Effect, SKILLS, SKILL_ABILITY } from "./index.js";

const valid = {
  name: "Thrain",
  level: 1,
  abilityScores: { method: "standardArray", scores: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 } },
  race: { kind: "race", id: "srd_dwarf", name: "Dwarf" },
  subrace: null,
  class: null,
  subclass: null,
  background: null,
  grants: [{ source: { kind: "race", id: "srd_dwarf", name: "Dwarf" }, effect: { type: "abilityBonus", ability: "con", amount: 2 } }],
  skillChoices: ["insight"],
  hitDie: 8,
  equipment: { armorId: null, shield: false, weapons: [], inventory: "" },
  spellcastingAbility: "wis",
  knownSpellIds: [],
  preparedSpellIds: [],
  currentHp: null,
  tempHp: 0,
  spentSpellSlots: { "1": 1 },
  conditionIds: [],
  notes: "",
};

describe("CharacterData", () => {
  it("parses a valid character", () => {
    expect(CharacterData.safeParse(valid).success).toBe(true);
  });
  it("rejects bad levels, scores, dice and keys", () => {
    for (const bad of [
      { ...valid, level: 0 },
      { ...valid, level: 21 },
      { ...valid, level: 1.5 },
      { ...valid, hitDie: 7 },
      { ...valid, name: "" },
      { ...valid, name: "x".repeat(101) },
      { ...valid, notes: "x".repeat(10001) },
      { ...valid, abilityScores: { method: "manual", scores: { ...valid.abilityScores.scores, str: 21 } } },
      { ...valid, abilityScores: { method: "bogus", scores: valid.abilityScores.scores } },
      { ...valid, abilityScores: { method: "rolled", scores: valid.abilityScores.scores, rolls: [] } },
      { ...valid, skillChoices: ["flying"] },
      { ...valid, spentSpellSlots: { "10": 1 } },
      { ...valid, grants: Array.from({ length: 301 }, () => valid.grants[0]) },
      { ...valid, equipment: { ...valid.equipment, weapons: Array.from({ length: 31 }, (_, i) => ({ id: String(i), weaponId: null, name: "x" })) } },
    ]) {
      expect(CharacterData.safeParse(bad).success).toBe(false);
    }
  });
  it("fills weapon defaults", () => {
    const r = CharacterData.parse({ ...valid, equipment: { ...valid.equipment, weapons: [{ id: "1", weaponId: "srd_rapier", name: "Rapier" }] } });
    expect(r.equipment.weapons[0]).toMatchObject({ magicBonus: 0, custom: null });
  });
});

describe("Effect", () => {
  it("defaults shieldAllowed to true and rejects unknown types", () => {
    expect(Effect.parse({ type: "unarmoredDefense", abilities: ["con"] })).toMatchObject({ shieldAllowed: true });
    expect(Effect.safeParse({ type: "fly", feet: 30 }).success).toBe(false);
    expect(Effect.safeParse({ type: "abilityBonus", ability: "luck", amount: 1 }).success).toBe(false);
  });
});

describe("skills", () => {
  it("maps all 18 skills to an ability", () => {
    expect(SKILLS).toHaveLength(18);
    expect(Object.keys(SKILL_ABILITY)).toHaveLength(18);
  });
});
