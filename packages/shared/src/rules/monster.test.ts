import { describe, expect, it } from "vitest";
import { Monster, MonsterLairSection } from "./monster.js";

const base = {
  id: "test_wyrm",
  documentKey: "test-doc",
  name: "Test Wyrm",
  size: "huge",
  type: "dragon",
  challengeRating: 10,
  armorClass: 18,
  hitPoints: 200,
  subtype: null,
  alignment: "neutral",
  armorDetail: null,
  hitDice: null,
  speed: { walk: 40, fly: 80, swim: null, climb: null, burrow: null, hover: false, unit: "feet" },
  abilityScores: { strength: 20, dexterity: 10, constitution: 20, intelligence: 12, wisdom: 12, charisma: 14 },
  savingThrows: {},
  skills: {},
  damageVulnerabilities: "",
  damageResistances: "",
  damageImmunities: "",
  conditionImmunities: "",
  senses: { darkvision: null, blindsight: null, tremorsense: null, truesight: null, passivePerception: null },
  languages: "",
  experiencePoints: null,
  proficiencyBonus: null,
  environments: [],
  traits: [],
  actions: [],
  bonusActions: [],
  reactions: [],
  legendaryActions: [],
};

describe("Monster lair data", () => {
  it("accepts records stored before lairActions and regionalEffects existed, defaulting both to null", () => {
    const m = Monster.parse(base);
    expect(m.lairActions).toBeNull();
    expect(m.regionalEffects).toBeNull();
  });

  it("accepts a section with an intro and entries, or an empty intro", () => {
    const entry = { name: "Rumble", description: "The ground shakes.", usage: null, legendaryCost: null };
    const m = Monster.parse({ ...base, lairActions: { description: "On initiative count 20...", items: [entry] }, regionalEffects: { description: "", items: [entry] } });
    expect(m.lairActions?.items).toHaveLength(1);
    expect(m.regionalEffects?.description).toBe("");
  });

  it("rejects a malformed section", () => {
    expect(MonsterLairSection.safeParse({ description: "x" }).success).toBe(false);
    expect(Monster.safeParse({ ...base, lairActions: { description: "x", items: [{ name: "" }] } }).success).toBe(false);
  });
});
