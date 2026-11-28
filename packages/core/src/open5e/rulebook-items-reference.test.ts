import { Item, ItemSet, ReferenceEntry, Rule, RuleChapter } from "@table-forge/shared";
import { describe, expect, it } from "vitest";
import * as fx from "./fixtures.js";
import { normaliseItem, normaliseItemSet } from "./item.js";
import { normaliseReference } from "./reference.js";
import { normaliseRule, normaliseRuleChapter } from "./rulebook.js";
import { documentKeyOf } from "./text.js";
import { SRD_2014_CHAPTER_ORDER, chapterSortIndex } from "./config.js";
import { itemSetStatement, itemStatement, referenceEntryStatement, ruleChapterStatement, ruleStatement } from "./sql.js";

const included = (key: string) => key === "srd-2014" || key === "core" || key === "tob";
const chapters = new Map([["srd_combat-sequence", "Combat Sequence"]]);

describe("documentKeyOf", () => {
  it("reads both the bare key and the document object", () => {
    expect(documentKeyOf("srd-2014")).toBe("srd-2014");
    expect(documentKeyOf({ key: "core" })).toBe("core");
    expect(documentKeyOf(null)).toBeNull();
    expect(documentKeyOf(undefined)).toBeNull();
  });
});

describe("rules chapters and rules", () => {
  it("normalises a chapter, taking the document from an object", () => {
    const c = normaliseRuleChapter(fx.combatChapter);
    expect(RuleChapter.parse(c)).toEqual(c);
    expect(c).toMatchObject({ id: "srd_combat-sequence", documentKey: "srd-2014", name: "Combat Sequence", description: "A typical combat encounter is a clash between two sides." });
  });

  it("normalises a rule, linking its chapter and keeping its order and heading level", () => {
    const r = normaliseRule(fx.surpriseRule, chapters);
    expect(Rule.parse(r)).toEqual(r);
    expect(r).toMatchObject({ id: "srd_combat-sequence_surprise", documentKey: "srd-2014", chapterId: "srd_combat-sequence", chapterName: "Combat Sequence", order: 2, headerLevel: 3 });
    expect(r.body).toBe("The DM determines who might be surprised.\n\n### Details\n\nA surprised creature cannot move or take an action.");
  });

  it("keeps rules in index order whatever order they arrive in", () => {
    const rules = [fx.surpriseRule, fx.initiativeRule].map((r) => normaliseRule(r, chapters));
    expect(rules.sort((a, b) => a.order - b.order).map((r) => r.name)).toEqual(["Initiative", "Surprise"]);
  });

  it("does not link a chapter that is not stored", () => {
    expect(normaliseRule(fx.surpriseRule, new Map())).toMatchObject({ chapterId: null, chapterName: null });
    expect(normaliseRule({ ...fx.surpriseRule, ruleset: null }, chapters)).toMatchObject({ chapterId: null });
  });

  it("clamps the heading level into 1 to 6 and defaults it", () => {
    expect(normaliseRule({ ...fx.surpriseRule, initialHeaderLevel: 9 }, chapters).headerLevel).toBe(6);
    expect(normaliseRule({ ...fx.surpriseRule, initialHeaderLevel: 0 }, chapters).headerLevel).toBe(1);
    expect(normaliseRule({ ...fx.surpriseRule, initialHeaderLevel: null }, chapters).headerLevel).toBe(2);
  });

  it("builds upserts that carry the chapter link and sort index", () => {
    const chapterSql = ruleChapterStatement(normaliseRuleChapter(fx.combatChapter), "r1");
    expect(chapterSql).toContain("INSERT INTO rule_chapters (id, document_key, name, name_search, sort_index, data, import_run)");
    expect(chapterSql).toContain(`'Combat Sequence', 'combat sequence', ${chapterSortIndex("srd_combat-sequence")},`);
    const st = ruleStatement(normaliseRule(fx.surpriseRule, chapters), "r1");
    expect(st).toContain("INSERT INTO rules (id, document_key, chapter_id, chapter_name, name, name_search, sort_index, data, import_run)");
    expect(st).toContain("'srd_combat-sequence', 'Combat Sequence', 'Surprise', 'surprise', 2,");
  });
});

describe("chapter order", () => {
  it("follows the SRD book order, with unlisted chapters after the listed ones", () => {
    expect(chapterSortIndex("srd_races")).toBe(0);
    expect(chapterSortIndex("srd_leveling-up")).toBe(1);
    expect(chapterSortIndex("srd_combat-sequence")).toBeLessThan(chapterSortIndex("srd_spellcasting"));
    expect(chapterSortIndex("srd_abilities")).toBeLessThan(chapterSortIndex("srd_combat-sequence"));
    expect(chapterSortIndex("srd-2024_combat")).toBe(SRD_2014_CHAPTER_ORDER.length);
  });

  it("lists each chapter once", () => {
    expect(new Set(SRD_2014_CHAPTER_ORDER).size).toBe(SRD_2014_CHAPTER_ORDER.length);
  });
});

describe("items", () => {
  it("normalises gear, with cost in gold and weight in pounds", () => {
    const i = normaliseItem(fx.rope);
    expect(Item.parse(i)).toEqual(i);
    expect(i).toMatchObject({ id: "srd_rope", documentKey: "srd-2014", category: "adventuring-gear", costGp: 1, weightLb: 10, size: "tiny", weaponId: null, armorId: null });
  });

  it("links an item to its weapon or armour record", () => {
    expect(normaliseItem(fx.battleaxeItem)).toMatchObject({ category: "weapon", weaponId: "srd_battleaxe", armorId: null });
    expect(normaliseItem(fx.breastplateItem)).toMatchObject({ category: "armor", armorId: "srd_breastplate", weaponId: null });
  });

  it("handles a free item with no weight or size", () => {
    expect(normaliseItem(fx.acidItem)).toMatchObject({ costGp: 0, weightLb: null, size: null });
  });

  it("rejects a bad number, an unexpected weight unit or no category", () => {
    expect(() => normaliseItem({ ...fx.rope, cost: "lots" })).toThrow('cost "lots"');
    expect(() => normaliseItem({ ...fx.rope, weight_unit: "kg" })).toThrow('weight unit "kg"');
    expect(() => normaliseItem({ ...fx.rope, category: null })).toThrow("no category");
  });

  it("builds an upsert with the filter columns", () => {
    const st = itemStatement(normaliseItem(fx.battleaxeItem), "r1");
    expect(st).toContain("INSERT INTO items (id, document_key, name, name_search, category, cost_gp, weight_lb, weapon_id, armor_id, data, import_run)");
    expect(st).toContain("'weapon', 10, 4, 'srd_battleaxe', NULL,");
    expect(itemStatement(normaliseItem(fx.acidItem), "r1")).toContain("0, NULL, NULL, NULL,");
  });
});

describe("item sets", () => {
  const known = (id: string) => id.startsWith("srd_");

  it("keeps the contents in order, dropping 2024 items and repeats", () => {
    const s = normaliseItemSet(fx.dungeoneersPack, known);
    expect(ItemSet.parse(s)).toEqual(s);
    expect(s.items).toEqual([
      { id: "srd_backpack", name: "Backpack" },
      { id: "srd_rope", name: "Hempen Rope" },
    ]);
    expect(s).toMatchObject({ id: "dungeoneers-pack", documentKey: "srd-2014", itemCount: 2 });
  });

  it("can be empty", () => {
    expect(normaliseItemSet({ ...fx.dungeoneersPack, items: null }, known)).toMatchObject({ itemCount: 0, items: [] });
  });

  it("stores the item count for the list", () => {
    expect(itemSetStatement(normaliseItemSet(fx.dungeoneersPack, known), "r1")).toContain("'dungeoneers-pack', 'srd-2014', 'Dungeoneer''s Pack', 'dungeoneer''s pack', 2,");
  });
});

describe("reference entries", () => {
  it("keeps only the descriptions from included documents, one entry each, owned by that document", () => {
    const entries = normaliseReference("ability", fx.abilityStrength, included);
    expect(entries).toHaveLength(1);
    const e = ReferenceEntry.parse(entries[0]);
    expect(e).toMatchObject({ id: "srd-2014_ability_str", documentKey: "srd-2014", kind: "ability", name: "Strength", abbreviation: "str", abilityKey: "strength" });
    expect(e.description).toBe("Strength measures bodily power.\n\n### Strength Checks");
  });

  it("drops a damage type's 2024 description", () => {
    const entries = normaliseReference("damage-type", fx.damageTypeAcid, included);
    expect(entries.map((e) => [e.documentKey, e.description])).toEqual([["srd-2014", "Corrosive spray."]]);
  });

  it("makes nothing for a record described only by excluded documents", () => {
    expect(normaliseReference("skill", fx.skillCulture, included)).toEqual([]);
  });

  it("maps a skill's ability to its full key", () => {
    expect(normaliseReference("skill", fx.skillAthletics, included)[0]).toMatchObject({ kind: "skill", ability: "strength", id: "srd-2014_skill_athletics" });
    expect(() => normaliseReference("skill", { ...fx.skillAthletics, ability: "luck" }, included)).toThrow('unknown skill ability "luck"');
  });

  it("normalises an alignment, a creature type and a school", () => {
    expect(ReferenceEntry.parse(normaliseReference("alignment", fx.alignmentLG, included)[0])).toMatchObject({ name: "Lawful Good", kind: "alignment", shortName: "LG", morality: "good", societalAttitude: "lawful", documentKey: "srd-2014" });
    expect(ReferenceEntry.parse(normaliseReference("creature-type", fx.creatureTypeBeast, included)[0])).toMatchObject({ id: "srd-2014_creature-type_beast" });
    expect(ReferenceEntry.parse(normaliseReference("spell-school", fx.schoolAbjuration, included)[0])).toMatchObject({ id: "core_spell-school_abjuration", documentKey: "core", description: "**Abjuration** spells are protective." });
  });

  it("normalises a size with its space and hit die", () => {
    expect(ReferenceEntry.parse(normaliseReference("size", fx.sizeLarge, included)[0])).toMatchObject({ kind: "size", rank: 4, spaceFeet: 10, hitDie: "d10", description: "", documentKey: "core" });
    expect(() => normaliseReference("size", { ...fx.sizeLarge, distance_unit: "meters" }, included)).toThrow("distance unit");
  });

  it("gives an item rarity, which has no document, to the core document", () => {
    const e = ReferenceEntry.parse(normaliseReference("item-rarity", fx.rarityRare, included)[0]);
    expect(e).toMatchObject({ id: "core_item-rarity_rare", documentKey: "core", kind: "item-rarity", rank: 3, name: "Rare" });
  });

  it("normalises a language with its script and flags", () => {
    expect(ReferenceEntry.parse(normaliseReference("language", fx.languageAbyssal, included)[0])).toMatchObject({ kind: "language", exotic: true, secret: false, script: "infernal" });
    expect(normaliseReference("language", { ...fx.languageAbyssal, script_language: null }, included)[0]).toMatchObject({ script: null });
  });

  it("normalises an environment, treating '[None provided]' as no text", () => {
    const e = ReferenceEntry.parse(normaliseReference("environment", fx.environmentAbyss, included)[0]);
    expect(e).toMatchObject({ kind: "environment", planar: true, aquatic: false, interior: false, description: "", id: "srd-2014_environment_srd_abyss" });
  });

  it("does not repeat the document in a weapon property's id", () => {
    const e = ReferenceEntry.parse(normaliseReference("weapon-property", fx.propertyFinesse, included)[0]);
    expect(e).toMatchObject({ id: "srd-2014_weapon-property_light", propertyType: null });
    expect(normaliseReference("weapon-property", { ...fx.propertyFinesse, type: "Mastery" }, included)[0]).toMatchObject({ propertyType: "Mastery" });
  });

  it("normalises an item category", () => {
    expect(ReferenceEntry.parse(normaliseReference("item-category", fx.categoryTools, included)[0])).toMatchObject({ id: "core_item-category_tools", documentKey: "core" });
  });

  it("refuses a record with no document (other than a rarity)", () => {
    expect(() => normaliseReference("language", { ...fx.languageAbyssal, document: null }, included)).toThrow("no document");
  });

  it("builds an upsert keyed on kind", () => {
    const st = referenceEntryStatement(ReferenceEntry.parse(normaliseReference("size", fx.sizeLarge, included)[0]), "r1");
    expect(st).toContain("INSERT INTO reference_entries (id, kind, document_key, name, name_search, sort_rank, data, import_run)");
    expect(st).toContain("'core_size_large', 'size', 'core', 'Large', 'large', 4,");
    const language = referenceEntryStatement(ReferenceEntry.parse(normaliseReference("language", fx.languageAbyssal, included)[0]), "r1");
    expect(language).toContain("'abyssal', NULL,");
  });
});
