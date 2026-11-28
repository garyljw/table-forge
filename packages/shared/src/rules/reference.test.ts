import { describe, expect, it } from "vitest";
import { ReferenceListQuery } from "./api.js";
import { REFERENCE_KINDS, ReferenceEntry } from "./reference.js";

const base = { documentKey: "srd-2014", description: "Text." };
const valid: Record<string, unknown> = {
  ability: { ...base, id: "srd-2014_ability_str", kind: "ability", name: "Strength", abbreviation: "str", abilityKey: "strength" },
  skill: { ...base, id: "srd-2014_skill_athletics", kind: "skill", name: "Athletics", ability: "strength" },
  "creature-type": { ...base, id: "srd-2014_creature-type_beast", kind: "creature-type", name: "Beast" },
  "damage-type": { ...base, id: "srd-2014_damage-type_acid", kind: "damage-type", name: "Acid" },
  alignment: { ...base, id: "srd-2014_alignment_lawful-good", kind: "alignment", name: "Lawful Good", shortName: "LG", morality: "good", societalAttitude: "lawful" },
  "spell-school": { ...base, id: "core_spell-school_abjuration", documentKey: "core", kind: "spell-school", name: "Abjuration" },
  size: { ...base, id: "core_size_large", documentKey: "core", kind: "size", name: "Large", rank: 4, spaceFeet: 10, hitDie: "d10" },
  "item-rarity": { ...base, id: "core_item-rarity_rare", documentKey: "core", kind: "item-rarity", name: "Rare", rank: 3, description: "" },
  "item-category": { ...base, id: "core_item-category_tools", documentKey: "core", kind: "item-category", name: "Tools", description: "" },
  language: { ...base, id: "core_language_abyssal", documentKey: "core", kind: "language", name: "Abyssal", exotic: true, secret: false, script: "infernal" },
  environment: { ...base, id: "core_environment_arctic", documentKey: "core", kind: "environment", name: "Arctic", aquatic: false, planar: false, interior: false },
  "weapon-property": { ...base, id: "srd-2014_weapon-property_finesse-wp", kind: "weapon-property", name: "Finesse", propertyType: null },
};

describe("ReferenceEntry", () => {
  it("has an example for every kind", () => {
    expect(Object.keys(valid).sort()).toEqual([...REFERENCE_KINDS].sort());
  });
  it.each(REFERENCE_KINDS)("accepts a valid %s", (kind) => {
    const parsed = ReferenceEntry.parse(valid[kind]);
    expect(parsed.kind).toBe(kind);
    expect(parsed.dmOnly).toBe(false);
  });
  it("rejects an unknown kind", () => {
    expect(ReferenceEntry.safeParse({ ...base, id: "x", kind: "spell", name: "X" }).success).toBe(false);
  });
  it.each([
    ["ability", { abbreviation: "STR" }],
    ["ability", { abilityKey: "might" }],
    ["skill", { ability: "int" }],
    ["alignment", { morality: undefined }],
    ["size", { rank: "4" }],
    ["size", { hitDie: "" }],
    ["item-rarity", { rank: undefined }],
    ["language", { exotic: "yes" }],
    ["language", { script: "" }],
    ["environment", { planar: undefined }],
    ["weapon-property", { propertyType: "" }],
    ["damage-type", { name: "" }],
  ])("rejects a bad %s: %j", (kind, patch) => {
    expect(ReferenceEntry.safeParse({ ...(valid[kind] as object), ...patch }).success).toBe(false);
  });
  it("rejects a size with no rank", () => {
    const { rank: _rank, ...noRank } = valid["size"] as Record<string, unknown>;
    void _rank;
    expect(ReferenceEntry.safeParse(noRank).success).toBe(false);
  });
});

describe("ReferenceListQuery", () => {
  it("parses a kind", () => {
    expect(ReferenceListQuery.parse({ kind: "weapon-property" }).kind).toBe("weapon-property");
  });
  it("rejects an unknown kind", () => {
    expect(ReferenceListQuery.safeParse({ kind: "Skill" }).success).toBe(false);
  });
});
