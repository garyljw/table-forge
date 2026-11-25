import { Armor, Background, MagicItem, Condition, ClassDetail, Feat, LicenseText, Monster, SourceDocument, Species, Spell, Weapon } from "@table-forge/shared";
import { describe, expect, it } from "vitest";
import { isDocumentIncluded, OPEN5E_CONTENT_RULES } from "./config.js";
import { normaliseArmor } from "./armor.js";
import { normaliseBackground } from "./background.js";
import { normaliseClass } from "./class.js";
import { normaliseConditions } from "./condition.js";
import { normaliseDocument, normaliseLicense } from "./document.js";
import { foldName } from "../fold.js";
import * as fx from "./fixtures.js";
import { normaliseFeat } from "./feat.js";
import { normaliseMagicItem } from "./magic-item.js";
import { normaliseMonster } from "./monster.js";
import { normaliseSpecies, resolveSpeciesParents } from "./species.js";
import { normaliseWeapon } from "./weapon.js";
import { buildImportStatements, sqlText } from "./sql.js";
import { normaliseSpell } from "./spell.js";

describe("document filter", () => {
  const doc = (key: string, gs: string) => ({ key, gamesystem: { key: gs } });
  it("includes 2014 documents and excludes the 2024 rules and other systems", () => {
    expect(isDocumentIncluded(doc("srd-2014", "5e-2014"))).toBe(true);
    expect(isDocumentIncluded(doc("tob", "5e-2014"))).toBe(true);
    expect(isDocumentIncluded(doc("srd-2024", "5e-2024"))).toBe(false);
    expect(isDocumentIncluded(doc("a5e-ag", "a5e"))).toBe(false);
  });
  it("honours the exclude and include lists", () => {
    expect(OPEN5E_CONTENT_RULES.excludeDocuments).toContain("elderberry-inn-icons");
    expect(isDocumentIncluded(doc("elderberry-inn-icons", "5e-2014"))).toBe(false);
    expect(isDocumentIncluded(doc("x", "other"), { ...OPEN5E_CONTENT_RULES, includeDocuments: ["x"] })).toBe(true);
  });
});

describe("normaliseDocument", () => {
  it("uses the required wording for the SRD", () => {
    const d = normaliseDocument(fx.srdDocument);
    expect(SourceDocument.safeParse(d).success).toBe(true);
    expect(d.attribution).toContain("System Reference Document 5.1");
    expect(d.attribution).toContain("creativecommons.org/licenses/by/4.0");
    expect(d.licenses[0]?.url).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(d.origin).toBe("open5e");
    expect(d.visibility).toBe("public");
  });
  it("builds an attribution line from metadata for third-party documents", () => {
    const d = normaliseDocument(fx.koboldDocument);
    expect(d.attribution).toContain("Tome of Beasts by Chris Harris, Dan Dillon, published by Kobold Press.");
    expect(d.attribution).toContain("OPEN GAME LICENSE Version 1.0a");
    expect(d.attribution).toContain("https://koboldpress.com/tome-of-beasts/");
  });
});

describe("normaliseSpell", () => {
  it("maps Fireball", () => {
    const s = normaliseSpell(fx.fireball);
    expect(Spell.parse(s)).toEqual(s);
    expect(s).toMatchObject({
      id: "srd_fireball",
      documentKey: "srd-2014",
      level: 3,
      school: "evocation",
      classes: ["sorcerer", "wizard"],
      castingTime: "action",
      savingThrow: "dexterity",
      damageRoll: "8d6",
      area: { shape: "sphere", sizeFeet: 20 },
    });
    expect(s.description.endsWith("successful one.")).toBe(true);
    expect(s.components.materialDescription).toBe("A tiny ball of bat guano and sulfur.");
  });
  it("reads a material cost that Open5e sends as a decimal string", () => {
    expect(normaliseSpell({ ...fx.fireball, material_cost: "25.00" }).components.materialCostGp).toBe(25);
    expect(normaliseSpell({ ...fx.fireball, material_cost: 1000 }).components.materialCostGp).toBe(1000);
    expect(() => normaliseSpell({ ...fx.fireball, material_cost: "lots" })).toThrow(/material cost/);
  });
  it("turns empty strings into null and keeps ritual and concentration", () => {
    const s = normaliseSpell(fx.detectMagic);
    expect(Spell.safeParse(s).success).toBe(true);
    expect(s).toMatchObject({ higherLevel: null, damageRoll: null, savingThrow: null, area: null, concentration: true, ritual: true });
    expect(s.components.materialDescription).toBeNull();
  });
});

describe("normaliseMonster", () => {
  it("maps the Goblin and orders actions by stat block position", () => {
    const m = normaliseMonster(fx.goblin);
    expect(Monster.parse(m)).toEqual(m);
    expect(m).toMatchObject({
      id: "srd_goblin",
      size: "small",
      type: "humanoid",
      challengeRating: 0.25,
      armorClass: 15,
      armorDetail: "leather armor, shield",
      hitPoints: 7,
      hitDice: "2d6",
      skills: { stealth: 6 },
      senses: { darkvision: 60, passivePerception: 9 },
    });
    expect(m.speed).toMatchObject({ walk: 30, fly: null, hover: false, unit: "feet" });
    expect(m.actions.map((a) => a.name)).toEqual(["Scimitar", "Shortbow"]);
    expect(m.traits.map((t) => t.name)).toEqual(["Nimble Escape"]);
  });
  it("splits action kinds and reads recharge, per-day and legendary cost", () => {
    const m = normaliseMonster(fx.testWyrm);
    expect(Monster.safeParse(m).success).toBe(true);
    expect(m.hitDice).toBe("19d12+133");
    expect(m.actions[0]).toMatchObject({ name: "Fire Breath", usage: { kind: "recharge", value: 5 } });
    expect(m.bonusActions[0]).toMatchObject({ name: "Tail Flick", usage: { kind: "perDay", value: 3 } });
    expect(m.legendaryActions.map((a) => [a.name, a.legendaryCost])).toEqual([["Detect", 1], ["Wing Beat", 2]]);
    expect(m.reactions.map((a) => a.name)).toEqual(["Parry"]);
    expect(m.damageResistances).toBe("bludgeoning from nonmagical attacks");
    expect(m.speed.hover).toBe(true);
    // Open5e v2 supplies no lair data.
    expect(m.lairActions).toBeNull();
    expect(m.regionalEffects).toBeNull();
  });
  it("allows a missing hit dice formula", () => {
    expect(normaliseMonster(fx.wyrmWithoutHitDice).hitDice).toBeNull();
  });
  it("rejects a speed unit that is not feet", () => {
    expect(() => normaliseMonster({ ...fx.goblin, speed: { unit: "meters", walk: 9 } })).toThrow(/unit/);
  });
});

describe("normaliseClass", () => {
  it("builds features, the level table and the proficiency and equipment blocks", () => {
    const c = normaliseClass(fx.wizard);
    expect(ClassDetail.parse(c)).toEqual(c);
    expect(c.parentClass).toBeNull();
    expect(c.savingThrows).toEqual(["Intelligence", "Wisdom"]);
    expect(c.proficiencies).toContain("**Armor:** None\n");
    expect(c.startingEquipment).toBe("A quarterstaff or a dagger");
    expect(c.features.map((f) => [f.name, f.levels])).toEqual([
      ["Arcane Recovery", [1]],
      ["Spellcasting", [1]],
      ["Ability Score Improvement", [4, 8]],
    ]);
    expect(c.table.map((t) => [t.name, t.kind])).toEqual([
      ["Proficiency Bonus", "proficiencyBonus"],
      ["Cantrips Known", "other"],
      ["1st", "spellSlots"],
    ]);
    expect(c.table[2]?.values).toEqual({ "1": "2", "2": "3" });
  });
  it("links a subclass to its parent", () => {
    const c = normaliseClass(fx.evocation);
    expect(ClassDetail.safeParse(c).success).toBe(true);
    expect(c.parentClass).toEqual({ id: "srd_wizard", name: "Wizard" });
    expect(c.hitDice).toBeNull();
  });
});

describe("normaliseConditions", () => {
  it("makes one condition per included document description", () => {
    const included = (key: string) => key === "srd-2014";
    const out = normaliseConditions(fx.blinded, included);
    expect(out).toHaveLength(1);
    expect(Condition.parse(out[0])).toEqual(out[0]);
    expect(out[0]).toMatchObject({ id: "srd-2014_blinded", documentKey: "srd-2014", name: "Blinded" });
    expect(out[0]?.description).toContain("automatically fails any ability check that requires sight.\n* Attack");
  });
  it("makes none when no description is from an included document", () => {
    expect(normaliseConditions(fx.blinded, () => false)).toEqual([]);
  });
});

describe("normaliseSpecies", () => {
  it("keeps the traits as free text", () => {
    const s = normaliseSpecies(fx.elf);
    expect(Species.parse(s)).toEqual(s);
    expect(s).toMatchObject({ id: "srd_elf", documentKey: "srd-2014", parentSpecies: null, description: "Elves are a magical people." });
    expect(s.traits.map((t) => t.name)).toEqual(["Darkvision", "Fey Ancestry"]);
    expect(s.traits[0]?.description).toContain("60 feet");
    expect(s.traits[0]?.type).toBeNull();
  });
  it("links a subspecies to its parent by key, with a provisional name", () => {
    const s = normaliseSpecies(fx.highElf);
    expect(Species.safeParse(s).success).toBe(true);
    expect(s.parentSpecies).toEqual({ id: "srd_elf", name: "Elf" });
  });
  it("resolves parent names, and keeps a subspecies whose parent is not stored", () => {
    const orphan = normaliseSpecies({ ...fx.highElf, key: "x_orphan", subspecies_of: "srd-2024_half-elf" });
    const r = resolveSpeciesParents([normaliseSpecies(fx.elf), normaliseSpecies(fx.highElf), orphan]);
    expect(r.species[1]?.parentSpecies).toEqual({ id: "srd_elf", name: "Elf" });
    expect(r.species[2]?.parentSpecies).toEqual({ id: null, name: "Half elf" });
    expect(r.unresolved.map((u) => [u.species.id, u.reason])).toEqual([["x_orphan", "parent not found"]]);
  });
  it("says why a subspecies is orphaned", () => {
    const sub = (id: string, parent: string) => normaliseSpecies({ ...fx.highElf, key: id, subspecies_of: parent });
    const r = resolveSpeciesParents([normaliseSpecies(fx.elf), sub("x_a", "x_gone"), sub("x_b", "srd_high-elf"), normaliseSpecies(fx.highElf)], new Set(["x_gone"]));
    expect(r.unresolved.map((u) => [u.species.id, u.reason])).toEqual([
      ["x_a", "parent failed to normalise"],
      ["x_b", "parent is itself a subspecies"],
    ]);
  });
});

describe("normaliseBackground", () => {
  it("keeps the benefits with their types", () => {
    const b = normaliseBackground(fx.acolyte);
    expect(Background.parse(b)).toEqual(b);
    expect(b.benefits.map((x) => [x.name, x.type])).toEqual([
      ["Shelter of the Faithful", "feature"],
      ["Skill Proficiencies", "skill_proficiency"],
    ]);
  });
});

describe("normaliseFeat", () => {
  it("keeps the prerequisite and drops empty benefits", () => {
    const f = normaliseFeat(fx.grappler);
    expect(Feat.parse(f)).toEqual(f);
    expect(f).toMatchObject({ prerequisite: "Strength 13 or higher", category: "GENERAL" });
    expect(f.benefits).toEqual(["You have advantage on attack rolls against a creature you are grappling."]);
    expect(normaliseFeat({ ...fx.grappler, prerequisite: "", has_prerequisite: false }).prerequisite).toBeNull();
  });
});

describe("normaliseWeapon", () => {
  it("maps damage, category, properties and range", () => {
    const w = normaliseWeapon(fx.longsword);
    expect(Weapon.parse(w)).toEqual(w);
    expect(w).toMatchObject({ category: "martial", kind: "melee", damageDice: "1d8", damageType: "slashing", range: null });
    expect(w.properties).toEqual([{ name: "Versatile", detail: "1d10", description: "Two-handed damage in parentheses." }]);
  });
  it("tells ranged from melee-with-thrown, including thrown-only ranged weapons", () => {
    const kind = (raw: Parameters<typeof normaliseWeapon>[0]) => normaliseWeapon(raw).kind;
    expect(kind(fx.shortbow)).toBe("ranged");
    expect(kind(fx.heavyCrossbow)).toBe("ranged");
    expect(kind(fx.dagger)).toBe("melee");
    expect(kind(fx.dart)).toBe("ranged");
    expect(normaliseWeapon(fx.shortbow)).toMatchObject({ category: "simple", range: { normalFeet: 80, longFeet: 320 } });
  });
  it("keeps a weapon with no damage type, with a null damage type", () => {
    const w = normaliseWeapon({ ...fx.longsword, damage_type: null });
    expect(Weapon.parse(w).damageType).toBeNull();
  });
});

describe("normaliseArmor", () => {
  it("maps heavy armour with a strength requirement", () => {
    const a = normaliseArmor(fx.chainMail);
    expect(Armor.parse(a)).toEqual(a);
    expect(a).toMatchObject({ category: "heavy", acBase: 16, addsDexModifier: false, dexModifierCap: null, strengthRequired: 13, stealthDisadvantage: true, acDisplay: "16" });
  });
  it("maps a dex cap", () => {
    expect(normaliseArmor(fx.breastplate)).toMatchObject({ category: "medium", addsDexModifier: true, dexModifierCap: 2, strengthRequired: null, stealthDisadvantage: false });
  });
  it.each([["Light armor", "light"], ["MEDIUM", "medium"], [" heavy ", "heavy"], ["shield", "shield"]])("accepts the category %j", (given, want) => {
    expect(normaliseArmor({ ...fx.chainMail, category: given }).category).toBe(want);
  });
  it("throws a clear message for an unknown category", () => {
    expect(() => normaliseArmor({ ...fx.chainMail, category: "robe" })).toThrow('unknown armor category "robe"');
  });
});

describe("normaliseLicense and copyright notice", () => {
  it("keeps the licence text and links known licences", () => {
    const l = normaliseLicense({ key: "ogl-10a", name: "OPEN GAME LICENSE Version 1.0a", desc: "text\r\n15. COPYRIGHT NOTICE " });
    expect(LicenseText.parse(l)).toEqual(l);
    expect(l.text).toBe("text\n15. COPYRIGHT NOTICE");
    expect(l.url).toContain("opengamingfoundation.org");
  });
  it("derives a Section 15 line for OGL documents only", () => {
    expect(normaliseDocument(fx.koboldDocument).copyrightNotice).toBe("Tome of Beasts Copyright 2016, Kobold Press; Authors Chris Harris, Dan Dillon.");
    expect(normaliseDocument({ ...fx.koboldDocument, licenses: [{ key: "cc-by-40", name: "CC BY" }] }).copyrightNotice).toBeNull();
  });
});

describe("SQL builder", () => {
  it("escapes quotes and strips NUL", () => {
    expect(sqlText("it's\u0000 ok")).toBe("'it''s ok'");
  });
  it("upserts every record, then deletes stale Open5e rows last", () => {
    const statements = buildImportStatements(
      {
        documents: [normaliseDocument(fx.srdDocument)],
        licenses: [],
        spells: [normaliseSpell(fx.fireball)],
        monsters: [normaliseMonster(fx.goblin)],
        classes: [normaliseClass(fx.wizard), normaliseClass(fx.evocation)],
        conditions: normaliseConditions(fx.blinded, () => true),
        species: [normaliseSpecies(fx.elf), normaliseSpecies(fx.highElf)],
        backgrounds: [normaliseBackground(fx.acolyte)],
        feats: [normaliseFeat(fx.grappler)],
        weapons: [normaliseWeapon(fx.longsword)],
        armor: [normaliseArmor(fx.chainMail)],
        magicItems: [normaliseMagicItem(fx.testBlade)],
      },
      "run-1",
    );
    const firstDelete = statements.findIndex((s) => s.startsWith("DELETE"));
    expect(statements.slice(0, firstDelete).every((s) => s.startsWith("INSERT"))).toBe(true);
    expect(statements.slice(firstDelete).every((s) => s.startsWith("DELETE") && s.includes("origin = 'open5e'"))).toBe(true);
    const spell = statements.find((s) => s.startsWith("INSERT INTO spells"));
    expect(spell).toContain("',sorcerer,wizard,'");
    expect(spell).toContain("ON CONFLICT(id) DO UPDATE");
    expect(spell).toContain("origin = 'open5e'");
    expect(statements.filter((s) => s.startsWith("INSERT INTO classes"))).toHaveLength(2);
    for (const table of ["species", "backgrounds", "feats", "weapons", "armor", "magic_items"]) {
      const insert = statements.find((s) => s.startsWith(`INSERT INTO ${table} `));
      expect(insert).toContain("origin = 'open5e'");
      expect(insert).toContain("ON CONFLICT(id) DO UPDATE");
    }
    expect(statements.find((s) => s.startsWith("INSERT INTO weapons"))).toContain("'martial', 'melee', '1d8', 'slashing'");
    expect(statements.filter((s) => s.startsWith("DELETE FROM armor"))).toHaveLength(1);
  });
});

describe("magic items", () => {
  it("normalises a weapon with a base item", () => {
    const m = normaliseMagicItem(fx.testBlade);
    expect(MagicItem.parse(m)).toEqual(m);
    expect(m).toMatchObject({
      id: "srd_blade",
      documentKey: "srd-2014",
      type: "weapon",
      rarity: "uncommon",
      requiresAttunement: false,
      baseItem: "longsword",
      attunementDetail: null,
      sentient: false,
      cursed: false,
      dmOnly: false,
    });
    expect(m.description).toBe("You have a +1 bonus to attack and damage rolls made with this magic weapon.");
  });
  it("strips 'requires attunement' from the detail", () => {
    const m = normaliseMagicItem(fx.testCharm);
    expect(m).toMatchObject({ type: "wondrous-item", rarity: "rare", requiresAttunement: true, attunementDetail: "by a Cleric", baseItem: null });
    expect(normaliseMagicItem({ ...fx.testCharm, attunement_detail: "requires attunement" }).attunementDetail).toBeNull();
    expect(normaliseMagicItem({ ...fx.testCharm, requires_attunement: false }).attunementDetail).toBeNull();
  });
  it("handles parentheses and case in the attunement detail", () => {
    const detail = (attunement_detail: string | null) => normaliseMagicItem({ ...fx.testCharm, attunement_detail }).attunementDetail;
    expect(detail("(requires attunement by a wizard)")).toBe("by a wizard");
    expect(detail("Requires Attunement")).toBeNull();
    expect(detail("(Requires Attunement)")).toBeNull();
    expect(detail("Requires Attunement by a Cleric or Paladin")).toBe("by a Cleric or Paladin");
    expect(detail("requires attunement outdoors at night")).toBe("outdoors at night");
    expect(detail(null)).toBeNull();
  });
  it("maps shields to armor, ammunition to weapon, and a missing rarity to varies", () => {
    expect(normaliseMagicItem({ ...fx.testCharm, category: { key: "shield" }, armor: { name: "Shield" } })).toMatchObject({ type: "armor", baseItem: "shield" });
    expect(normaliseMagicItem({ ...fx.testCharm, category: { key: "ammunition" } }).type).toBe("weapon");
    expect(normaliseMagicItem({ ...fx.testCharm, rarity: null }).rarity).toBe("varies");
  });
  it("rejects an unknown category or rarity", () => {
    expect(() => normaliseMagicItem({ ...fx.testCharm, category: { key: "gem" } })).toThrow('unknown magic item category "gem"');
    expect(() => normaliseMagicItem({ ...fx.testCharm, category: null })).toThrow("unknown magic item category");
    expect(() => normaliseMagicItem({ ...fx.testCharm, rarity: { key: "mythic" } })).toThrow('unknown rarity "mythic"');
  });
});

describe("foldName", () => {
  it("lowercases and strips accents", () => {
    expect(foldName("  \u00c9owyn\u2019s Bl\u00e9ssing ")).toBe("eowyn\u2019s blessing");
    expect(foldName("Ni\u00f1o")).toBe("nino");
    expect(foldName("Fireball")).toBe("fireball");
  });
});
