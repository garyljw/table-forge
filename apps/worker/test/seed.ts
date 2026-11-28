import { buildImportStatements, chapterSortIndex, foldName, type ImportBundle } from "@table-forge/core";
import type { Armor, Background, ClassDetail, Condition, Feat, Item, ItemSet, LicenseText, MagicItem, Monster, ReferenceEntry, RollTable, Rule, RuleChapter, RuleSection, MonsterFeature, SourceDocument, Species, Spell, Weapon } from "@table-forge/shared";
import { env } from "cloudflare:workers";

export const srd: SourceDocument = {
  key: "srd-2014",
  name: "System Reference Document 5.1",
  displayName: "5e 2014 Rules",
  publisher: "Wizards of the Coast",
  author: "Wizards of the Coast",
  gameSystem: "5e-2014",
  licenses: [{ key: "cc-by-40", name: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }],
  attribution: "SRD ATTRIBUTION TEXT",
  copyrightNotice: null,
  url: "https://dnd.wizards.com/resources/systems-reference-document",
  publicationDate: null,
  origin: "open5e",
  visibility: "public",
};

export const tob: SourceDocument = {
  ...srd,
  key: "tob",
  name: "Tome of Beasts",
  displayName: "Tome of Beasts",
  publisher: "Kobold Press",
  attribution: "TOB ATTRIBUTION TEXT",
  copyrightNotice: "Tome of Beasts Copyright 2016, Kobold Press.",
  licenses: [{ key: "ogl-10a", name: "OPEN GAME LICENSE Version 1.0a", url: null }],
};

/** Stands in for private book data: must never be served by the public rules routes. */
export const secret: SourceDocument = {
  ...srd,
  key: "secret-book",
  name: "Secret Book",
  displayName: "Secret Book",
  attribution: "PRIVATE",
  origin: "private",
  visibility: "private",
};

export function spell(id: string, name: string, over: Partial<Spell> = {}): Spell {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    level: 1,
    school: "evocation",
    classes: ["wizard"],
    concentration: false,
    ritual: false,
    castingTime: "action",
    range: "60 feet",
    description: `${name} description`,
    higherLevel: null,
    duration: "Instantaneous",
    reactionCondition: null,
    components: { verbal: true, somatic: true, material: false, materialDescription: null, materialCostGp: null, materialConsumed: false },
    attackRoll: false,
    savingThrow: null,
    damageRoll: null,
    damageTypes: [],
    area: null,
    targetType: null,
    targetCount: null,
    ...over,
  };
}

const feature = (name: string): MonsterFeature => ({ name, description: `${name} text`, usage: null, legendaryCost: null });

export function monster(id: string, name: string, over: Partial<Monster> = {}): Monster {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    size: "medium",
    type: "humanoid",
    challengeRating: 1,
    armorClass: 12,
    hitPoints: 20,
    subtype: null,
    alignment: "neutral",
    armorDetail: null,
    hitDice: "4d8+2",
    speed: { walk: 30, fly: null, swim: null, climb: null, burrow: null, hover: false, unit: "feet" },
    abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    savingThrows: {},
    skills: {},
    damageVulnerabilities: "",
    damageResistances: "",
    damageImmunities: "",
    conditionImmunities: "",
    senses: { darkvision: null, blindsight: null, tremorsense: null, truesight: null, passivePerception: 10 },
    languages: "Common",
    experiencePoints: 200,
    proficiencyBonus: null,
    environments: [],
    traits: [feature("Trait")],
    actions: [feature("Slam")],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
    lairActions: null,
    regionalEffects: null,
    ...over,
  };
}

export function klass(id: string, name: string, over: Partial<ClassDetail> = {}): ClassDetail {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    parentClass: null,
    hitDice: "D6",
    casterType: "FULL",
    description: "",
    hitPoints: null,
    savingThrows: ["Intelligence"],
    primaryAbilities: [],
    proficiencies: null,
    startingEquipment: null,
    features: [{ id: `${id}_f`, name: "Spellcasting", description: "text", levels: [1] }],
    table: [{ name: "Proficiency Bonus", kind: "proficiencyBonus", values: { "1": "+2" } }],
    ...over,
  };
}

export function condition(id: string, name: string, over: Partial<Condition> = {}): Condition {
  return { id, documentKey: "srd-2014", dmOnly: false, name, description: `${name} text`, ...over };
}

export function species(id: string, name: string, over: Partial<Species> = {}): Species {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    parentSpecies: null,
    description: `${name} description`,
    traits: [{ name: "Darkvision", description: "You can see in the dark.", type: null }],
    ...over,
  };
}

export function background(id: string, name: string, over: Partial<Background> = {}): Background {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    description: `${name} description`,
    benefits: [{ name: "Skill Proficiencies", description: "Insight, Religion", type: "skill_proficiency" }],
    ...over,
  };
}

export function feat(id: string, name: string, over: Partial<Feat> = {}): Feat {
  return { id, documentKey: "srd-2014", dmOnly: false, name, prerequisite: null, category: "GENERAL", description: `${name} description`, benefits: ["A benefit."], ...over };
}

export function weapon(id: string, name: string, over: Partial<Weapon> = {}): Weapon {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    category: "martial",
    kind: "melee",
    damageDice: "1d8",
    damageType: "slashing",
    improvised: false,
    range: null,
    properties: [{ name: "Versatile", detail: "1d10", description: "Two hands." }],
    ...over,
  };
}

export function armor(id: string, name: string, over: Partial<Armor> = {}): Armor {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    category: "medium",
    acBase: 14,
    addsDexModifier: true,
    dexModifierCap: 2,
    strengthRequired: null,
    stealthDisadvantage: false,
    acDisplay: "14 + Dex modifier (max 2)",
    ...over,
  };
}

export function magicItem(id: string, name: string, over: Partial<MagicItem> = {}): MagicItem {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    type: "wondrous-item",
    rarity: "uncommon",
    requiresAttunement: false,
    baseItem: null,
    attunementDetail: null,
    description: `${name} description`,
    sentient: false,
    cursed: false,
    ...over,
  };
}

export function rollTable(id: string, name: string, over: Partial<RollTable> = {}): RollTable {
  return {
    id,
    documentKey: "srd-2014",
    dmOnly: false,
    name,
    category: "trinket",
    dice: "d4",
    description: null,
    columns: ["Trinket"],
    rows: [
      { min: 1, max: 1, cells: ["A bent spoon"] },
      { min: 2, max: 3, cells: ["A cracked marble"] },
      { min: 4, max: 4, cells: ["A feather"] },
    ],
    ...over,
  };
}

export function ruleSection(id: string, name: string, over: Partial<RuleSection> = {}): RuleSection {
  return { id, documentKey: "srd-2014", dmOnly: false, name, category: "variant-rule", relatedIds: [], body: `${name} body`, ...over };
}

export function ruleChapter(id: string, name: string, over: Partial<RuleChapter> = {}): RuleChapter {
  return { id, documentKey: "srd-2014", dmOnly: false, name, description: `${name} introduction`, ...over };
}

export function rule(id: string, name: string, over: Partial<Rule> = {}): Rule {
  return { id, documentKey: "srd-2014", dmOnly: false, name, chapterId: "srd_test-combat", chapterName: "Test Combat", order: 1, headerLevel: 3, body: `${name} body`, ...over };
}

export function item(id: string, name: string, over: Partial<Item> = {}): Item {
  return { id, documentKey: "srd-2014", dmOnly: false, name, category: "adventuring-gear", costGp: 1, weightLb: 2, description: `${name} description`, size: "tiny", weaponId: null, armorId: null, ...over };
}

export function itemSet(id: string, name: string, over: Partial<ItemSet> = {}): ItemSet {
  const items = over.items ?? [];
  return { id, documentKey: "srd-2014", dmOnly: false, name, itemCount: items.length, description: `${name} description`, items, ...over };
}

type EntryOver<K extends ReferenceEntry["kind"]> = Partial<Extract<ReferenceEntry, { kind: K }>>;
const entryBase = (kind: string, slug: string, name: string, documentKey: string) => ({ id: `${documentKey}_${kind}_${slug}`, documentKey, dmOnly: false, name, description: `${name} description` });
export const referenceEntries = {
  ability: (slug: string, name: string, over: EntryOver<"ability"> = {}) =>
    ({ ...entryBase("ability", slug, name, "srd-2014"), kind: "ability", abbreviation: "str", abilityKey: "strength", ...over }) as ReferenceEntry,
  skill: (slug: string, name: string, over: EntryOver<"skill"> = {}) => ({ ...entryBase("skill", slug, name, "srd-2014"), kind: "skill", ability: "strength", ...over }) as ReferenceEntry,
  size: (slug: string, name: string, over: EntryOver<"size"> = {}) =>
    ({ ...entryBase("size", slug, name, "srd-2014"), kind: "size", rank: 4, spaceFeet: 10, hitDie: "d10", ...over }) as ReferenceEntry,
  language: (slug: string, name: string, over: EntryOver<"language"> = {}) =>
    ({ ...entryBase("language", slug, name, "srd-2014"), kind: "language", exotic: false, secret: false, script: null, ...over }) as ReferenceEntry,
  damageType: (slug: string, name: string, over: EntryOver<"damage-type"> = {}) => ({ ...entryBase("damage-type", slug, name, "srd-2014"), kind: "damage-type", ...over }) as ReferenceEntry,
  weaponProperty: (slug: string, name: string, over: EntryOver<"weapon-property"> = {}) =>
    ({ ...entryBase("weapon-property", slug, name, "srd-2014"), kind: "weapon-property", propertyType: null, ...over }) as ReferenceEntry,
};

export const SEED = {
  documents: [srd, tob, secret],
  spells: [
    spell("srd_fireball", "Fireball", { level: 3, classes: ["sorcerer", "wizard"], range: "150 feet", damageRoll: "8d6", damageTypes: ["fire"] }),
    spell("srd_fire-bolt", "Fire Bolt", { level: 0, classes: ["sorcerer", "wizard"] }),
    spell("srd_detect-magic", "Detect Magic", { level: 1, school: "divination", classes: ["bard", "cleric"], concentration: true, ritual: true }),
    spell("srd_cure-wounds", "Cure Wounds", { level: 1, school: "evocation", classes: ["cleric"] }),
    spell("tob_dark-flame", "Dark Flame", { documentKey: "tob", level: 2, school: "necromancy", classes: [] }),
    spell("secret_hidden-spell", "Hidden Fire Spell", { documentKey: "secret-book" }),
    spell("srd_100-percent", "100% Pure_Fire", { level: 2 }),
  ],
  monsters: [
    monster("srd_goblin", "Goblin", { size: "small", challengeRating: 0.25, armorClass: 15, hitPoints: 7 }),
    monster("srd_adult-red-dragon", "Adult Red Dragon", { size: "huge", type: "dragon", challengeRating: 17, hitPoints: 256 }),
    monster("srd_owlbear", "Owlbear", { size: "large", type: "monstrosity", challengeRating: 3 }),
    monster("tob_fire-imp", "Fire Imp", { documentKey: "tob", type: "fiend", challengeRating: 0.125 }),
    monster("secret_hidden-beast", "Hidden Beast", { documentKey: "secret-book" }),
  ],
  classes: [
    klass("srd_wizard", "Wizard"),
    klass("srd_fighter", "Fighter", { hitDice: "D10", casterType: null }),
    klass("srd_school-of-evocation", "School of Evocation", { parentClass: { id: "srd_wizard", name: "Wizard" }, hitDice: null, casterType: null }),
    klass("tob_wizard-path", "Path of Tomes", { documentKey: "tob", parentClass: { id: "srd_wizard", name: "Wizard" } }),
    klass("secret_hidden-subclass", "Hidden Subclass", { documentKey: "secret-book", parentClass: { id: "srd_wizard", name: "Wizard" } }),
  ],
  conditions: [condition("srd-2014_blinded", "Blinded"), condition("srd-2014_charmed", "Charmed")],
  species: [
    species("srd_elf", "Elf"),
    species("srd_dwarf", "Dwarf"),
    species("srd_high-elf", "High Elf", { parentSpecies: { id: "srd_elf", name: "Elf" } }),
    species("tob_wood-elf", "Wood Elf", { documentKey: "tob", parentSpecies: { id: "srd_elf", name: "Elf" } }),
    species("secret_hidden-species", "Hidden Species", { documentKey: "secret-book" }),
    species("secret_hidden-elf", "Hidden Elf", { documentKey: "secret-book", parentSpecies: { id: "srd_elf", name: "Elf" } }),
  ],
  backgrounds: [
    background("srd_acolyte", "Acolyte"),
    background("tob_caravan-guard", "Caravan Guard", { documentKey: "tob" }),
    background("secret_hidden-background", "Hidden Background", { documentKey: "secret-book" }),
  ],
  feats: [
    feat("srd_grappler", "Grappler", { prerequisite: "Strength 13 or higher" }),
    feat("tob_lucky-streak", "Lucky Streak", { documentKey: "tob" }),
    feat("secret_hidden-feat", "Hidden Feat", { documentKey: "secret-book" }),
  ],
  weapons: [
    weapon("srd_longsword", "Longsword"),
    weapon("srd_dagger", "Dagger", { category: "simple", damageType: "piercing", damageDice: "1d4", range: { normalFeet: 20, longFeet: 60 } }),
    weapon("srd_net", "Net", { damageDice: "0", damageType: null, category: "martial", kind: "ranged" }),
    weapon("srd_shortbow", "Shortbow", { category: "simple", kind: "ranged", damageType: "piercing", damageDice: "1d6", range: { normalFeet: 80, longFeet: 320 } }),
    weapon("secret_hidden-blade", "Hidden Blade", { documentKey: "secret-book" }),
  ],
  armor: [
    armor("srd_breastplate", "Breastplate"),
    armor("srd_chain-mail", "Chain Mail", { category: "heavy", acBase: 16, addsDexModifier: false, dexModifierCap: null, strengthRequired: 13, stealthDisadvantage: true, acDisplay: "16" }),
    armor("srd_leather", "Leather", { category: "light", acBase: 11, dexModifierCap: null, acDisplay: "11 + Dex modifier" }),
    armor("secret_hidden-plate", "Hidden Plate", { documentKey: "secret-book", category: "heavy" }),
  ],
  magicItems: [
    magicItem("srd_test-blade", "Test Blade +1", { type: "weapon", baseItem: "longsword" }),
    magicItem("srd_test-ring", "Test Ring", { type: "ring", rarity: "rare", requiresAttunement: true, attunementDetail: "by a wizard" }),
    magicItem("srd_test-potion", "Test Potion", { type: "potion", rarity: "common" }),
    magicItem("tob_test-charm", "Test Charm", { documentKey: "tob", rarity: "very-rare", cursed: true }),
    magicItem("secret_hidden-idol", "Hidden Idol", { documentKey: "secret-book", rarity: "legendary" }),
  ],
  rollTables: [
    rollTable("srd_test-trinkets", "Test Trinkets"),
    rollTable("srd_test-loot", "Test Loot", { category: "treasure", dice: "d6", description: "Roll for loot.", columns: ["Item", "Value"], rows: [{ min: 1, max: 6, cells: ["A coin", "1 gp"] }] }),
    rollTable("tob_test-encounters", "Test Encounters", { documentKey: "tob", category: "encounter" }),
    rollTable("secret_hidden-table", "Hidden Table", { documentKey: "secret-book", category: "madness" }),
  ],
  ruleSections: [
    ruleSection("srd_test-flanking", "Test Flanking", { relatedIds: ["srd_wizard"], body: "Flank **well**." }),
    ruleSection("srd_test-pit", "Test Pit", { category: "trap" }),
    ruleSection("tob_test-fever", "Test Fever", { documentKey: "tob", category: "disease" }),
    ruleSection("secret_hidden-section", "Hidden Section", { documentKey: "secret-book", category: "lore" }),
  ],
  ruleChapters: [
    ruleChapter("srd_test-combat", "Test Combat"),
    ruleChapter("srd_test-magic", "Test Magic", { description: "" }),
    ruleChapter("tob_test-extras", "Test Extras", { documentKey: "tob" }),
    ruleChapter("secret_hidden-chapter", "Hidden Chapter", { documentKey: "secret-book" }),
  ],
  // "Surprise" reads first in its chapter but sorts after "Attack" by name.
  rules: [
    rule("srd_test-combat_surprise", "Surprise", { order: 1, body: "Be **surprised**." }),
    rule("srd_test-combat_attack", "Attack", { order: 2, headerLevel: 2 }),
    rule("srd_test-magic_slots", "Spell Slots", { chapterId: "srd_test-magic", chapterName: "Test Magic" }),
    rule("srd_test-orphan", "Orphan Rule", { chapterId: null, chapterName: null }),
    rule("tob_test-extras_extra", "Extra Rule", { documentKey: "tob", chapterId: "tob_test-extras", chapterName: "Test Extras" }),
    rule("secret_hidden-rule", "Hidden Rule", { documentKey: "secret-book", chapterId: "secret_hidden-chapter", chapterName: "Hidden Chapter" }),
  ],
  items: [
    item("srd_test-rope", "Test Rope", { costGp: 1, weightLb: 10 }),
    item("srd_test-lute", "Test Lute", { category: "tools", costGp: 35, weightLb: 2 }),
    item("srd_test-longsword", "Test Longsword", { category: "weapon", costGp: 15, weightLb: 3, weaponId: "srd_longsword" }),
    item("srd_test-chain-mail", "Test Chain Mail", { category: "armor", costGp: 75, weightLb: 55, armorId: "srd_chain-mail" }),
    item("srd_test-shield", "Test Shield", { category: "shield", costGp: 10, weightLb: 6 }),
    item("tob_test-gadget", "Test Gadget", { documentKey: "tob", category: "tools", costGp: 0, weightLb: null, size: null }),
    item("secret_hidden-trinket", "Hidden Trinket", { documentKey: "secret-book" }),
  ],
  itemSets: [
    itemSet("test-pack", "Test Pack", { items: [{ id: "srd_test-rope", name: "Test Rope" }, { id: "srd_test-lute", name: "Test Lute" }] }),
    itemSet("test-focuses", "Test Focuses", { items: [] }),
    itemSet("tob_test-set", "Test Set", { documentKey: "tob", items: [{ id: "tob_test-gadget", name: "Test Gadget" }] }),
    itemSet("secret_hidden-pack", "Hidden Pack", { documentKey: "secret-book" }),
  ],
  referenceEntries: [
    referenceEntries.ability("str", "Strength"),
    referenceEntries.skill("athletics", "Athletics"),
    referenceEntries.size("large", "Large"),
    referenceEntries.size("tiny", "Tiny", { rank: 1, spaceFeet: 2.5, hitDie: "d4" }),
    referenceEntries.language("abyssal", "Abyssal", { exotic: true, script: "infernal" }),
    referenceEntries.language("common", "Common"),
    referenceEntries.damageType("acid", "Acid"),
    referenceEntries.weaponProperty("finesse-wp", "Finesse"),
    { ...referenceEntries.language("void-speech", "Void Speech"), documentKey: "tob", id: "tob_language_void-speech" } as ReferenceEntry,
    { ...referenceEntries.damageType("hidden", "Hidden Damage"), documentKey: "secret-book", id: "secret-book_damage-type_hidden" } as ReferenceEntry,
  ],
};

export const LICENSES: LicenseText[] = [
  { key: "cc-by-40", name: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/", text: "CC TEXT" },
  { key: "ogl-10a", name: "OPEN GAME LICENSE Version 1.0a", url: null, text: "OGL TEXT" },
];

export const openBundle = (run: string, over: Partial<ImportBundle> = {}): string[] =>
  buildImportStatements(
    {
      licenses: LICENSES,
      documents: SEED.documents.filter((d) => d.origin === "open5e"),
      spells: SEED.spells.filter((s) => s.documentKey !== "secret-book"),
      monsters: SEED.monsters.filter((m) => m.documentKey !== "secret-book"),
      classes: SEED.classes.filter((c) => c.documentKey !== "secret-book"),
      conditions: SEED.conditions,
      species: SEED.species.filter((x) => x.documentKey !== "secret-book"),
      backgrounds: SEED.backgrounds.filter((x) => x.documentKey !== "secret-book"),
      feats: SEED.feats.filter((x) => x.documentKey !== "secret-book"),
      weapons: SEED.weapons.filter((x) => x.documentKey !== "secret-book"),
      armor: SEED.armor.filter((x) => x.documentKey !== "secret-book"),
      magicItems: SEED.magicItems.filter((x) => x.documentKey !== "secret-book"),
      ruleChapters: SEED.ruleChapters.filter((x) => x.documentKey !== "secret-book"),
      rules: SEED.rules.filter((x) => x.documentKey !== "secret-book"),
      items: SEED.items.filter((x) => x.documentKey !== "secret-book"),
      itemSets: SEED.itemSets.filter((x) => x.documentKey !== "secret-book"),
      referenceEntries: SEED.referenceEntries.filter((x) => x.documentKey !== "secret-book"),
      ...over,
    },
    run,
  );

export async function runStatements(statements: string[]): Promise<void> {
  await env.DB.batch(statements.map((s) => env.DB.prepare(s)));
}

/** Removes everything, then loads the Open5e seed (via the real import SQL) and a private document's rows. */
export async function seedRules(): Promise<void> {
  const clear = ["spells", "monsters", "classes", "conditions", "species", "backgrounds", "feats", "weapons", "armor", "magic_items", "roll_tables", "rule_sections", "rule_chapters", "rules", "items", "item_sets", "reference_entries", "documents", "licenses", "book_owners", "users"].map((t) => `DELETE FROM ${t};`);
  const j = (v: unknown) => JSON.stringify(v);
  const priv = [
    env.DB.prepare("INSERT INTO documents (key, origin, visibility, name, display_name, game_system, data) VALUES (?, 'private', 'private', ?, ?, ?, ?)").bind(
      secret.key, secret.name, secret.displayName, secret.gameSystem, j(secret),
    ),
    ...SEED.spells
      .filter((s) => s.documentKey === "secret-book")
      .map((s) =>
        env.DB.prepare("INSERT INTO spells (id, document_key, name, name_search, level, school, classes, concentration, ritual, casting_time, range_text, data) VALUES (?, ?, ?, ?, 1, 'evocation', '', 0, 0, 'action', '60 feet', ?)").bind(
          s.id, s.documentKey, s.name, foldName(s.name), j(s),
        ),
      ),
    ...SEED.monsters
      .filter((m) => m.documentKey === "secret-book")
      .map((m) =>
        env.DB.prepare("INSERT INTO monsters (id, document_key, name, name_search, size, type, challenge_rating, armor_class, hit_points, data) VALUES (?, ?, ?, ?, 'medium', 'beast', 1, 10, 10, ?)").bind(
          m.id, m.documentKey, m.name, foldName(m.name), j(m),
        ),
      ),
    ...SEED.classes
      .filter((c) => c.documentKey === "secret-book")
      .map((c) =>
        env.DB.prepare("INSERT INTO classes (id, document_key, name, name_search, parent_id, parent_name, data) VALUES (?, ?, ?, ?, 'srd_wizard', 'Wizard', ?)").bind(
          c.id, c.documentKey, c.name, foldName(c.name), j(c),
        ),
      ),
    ...SEED.species
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO species (id, document_key, name, name_search, parent_id, parent_name, data) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(
          x.id, x.documentKey, x.name, foldName(x.name), x.parentSpecies?.id ?? null, x.parentSpecies?.name ?? null, j(x),
        ),
      ),
    ...SEED.backgrounds
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO backgrounds (id, document_key, name, name_search, data) VALUES (?, ?, ?, ?, ?)").bind(x.id, x.documentKey, x.name, foldName(x.name), j(x)),
      ),
    ...SEED.feats
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO feats (id, document_key, name, name_search, prerequisite, data) VALUES (?, ?, ?, ?, NULL, ?)").bind(x.id, x.documentKey, x.name, foldName(x.name), j(x)),
      ),
    ...SEED.weapons
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO weapons (id, document_key, name, name_search, category, kind, damage_dice, damage_type, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          x.id, x.documentKey, x.name, foldName(x.name), x.category, x.kind, x.damageDice, x.damageType, j(x),
        ),
      ),
    ...SEED.armor
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO armor (id, document_key, name, name_search, category, ac_base, adds_dex_modifier, stealth_disadvantage, ac_display, data) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)").bind(
          x.id, x.documentKey, x.name, foldName(x.name), x.category, x.acBase, x.acDisplay, j(x),
        ),
      ),
    ...SEED.magicItems
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO magic_items (id, document_key, name, name_search, type, rarity, requires_attunement, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
          x.id, x.documentKey, x.name, foldName(x.name), x.type, x.rarity, x.requiresAttunement ? 1 : 0, j(x),
        ),
      ),
    ...SEED.rollTables
      .filter((x) => x.documentKey === "secret-book")
      .map((x) => rollTableInsert(x, null)),
    ...SEED.ruleSections
      .filter((x) => x.documentKey === "secret-book")
      .map((x) => ruleSectionInsert(x, null)),
    ...SEED.ruleChapters
      .filter((x) => x.documentKey === "secret-book")
      .map((x) => env.DB.prepare("INSERT INTO rule_chapters (id, document_key, name, name_search, sort_index, data) VALUES (?, ?, ?, ?, ?, ?)").bind(x.id, x.documentKey, x.name, foldName(x.name), chapterSortIndex(x.id), j(x))),
    ...SEED.rules
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO rules (id, document_key, chapter_id, chapter_name, name, name_search, sort_index, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
          x.id, x.documentKey, x.chapterId, x.chapterName, x.name, foldName(x.name), x.order, j(x),
        ),
      ),
    ...SEED.items
      .filter((x) => x.documentKey === "secret-book")
      .map((x) =>
        env.DB.prepare("INSERT INTO items (id, document_key, name, name_search, category, cost_gp, weight_lb, weapon_id, armor_id, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          x.id, x.documentKey, x.name, foldName(x.name), x.category, x.costGp, x.weightLb, x.weaponId, x.armorId, j(x),
        ),
      ),
    ...SEED.itemSets
      .filter((x) => x.documentKey === "secret-book")
      .map((x) => env.DB.prepare("INSERT INTO item_sets (id, document_key, name, name_search, item_count, data) VALUES (?, ?, ?, ?, ?, ?)").bind(x.id, x.documentKey, x.name, foldName(x.name), x.itemCount, j(x))),
    ...SEED.referenceEntries
      .filter((x) => x.documentKey === "secret-book")
      .map((x) => env.DB.prepare("INSERT INTO reference_entries (id, kind, document_key, name, name_search, sort_rank, data) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(x.id, x.kind, x.documentKey, x.name, foldName(x.name), "rank" in x ? x.rank : null, j(x))),
  ];
  await env.DB.batch([...clear.map((s) => env.DB.prepare(s)), ...priv]);
  // Open5e rows go in afterwards: the document guard needs the documents to exist, and the
  // private document is not an Open5e one, so its rows are untouched by the import.
  await runStatements(openBundle("run-1"));
  // Open5e supplies no roll tables, so these are written directly. The public ones carry run-1's marker
  // so the import's stale-row deletes (which would otherwise remove any row in an Open5e document) keep them.
  await env.DB.batch(SEED.rollTables.filter((x) => x.documentKey !== "secret-book").map((x) => rollTableInsert(x, "run-1")));
  await env.DB.batch(SEED.ruleSections.filter((x) => x.documentKey !== "secret-book").map((x) => ruleSectionInsert(x, "run-1")));
}

function ruleSectionInsert(x: RuleSection, run: string | null) {
  return env.DB.prepare("INSERT INTO rule_sections (id, document_key, name, name_search, category, data, import_run) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(
    x.id, x.documentKey, x.name, foldName(x.name), x.category, JSON.stringify(x), run,
  );
}

function rollTableInsert(x: RollTable, run: string | null) {
  return env.DB.prepare("INSERT INTO roll_tables (id, document_key, name, name_search, category, dice, data, import_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
    x.id, x.documentKey, x.name, foldName(x.name), x.category, x.dice, JSON.stringify(x), run,
  );
}

/** Ticks: this email owns these private books. Emails are stored the way the admin API stores them. */
export async function own(email: string, ...documentKeys: string[]): Promise<void> {
  await env.DB.batch(
    documentKeys.map((k) => env.DB.prepare("INSERT OR IGNORE INTO book_owners (email, document_key, granted_at) VALUES (?, ?, ?)").bind(email.trim().toLowerCase(), k, "2026-01-01T00:00:00.000Z")),
  );
}

/** Adds a second private book ("other-book") with one invented spell, standing in for a book the caller may not own. */
export async function addOtherBook(): Promise<void> {
  const doc = { ...secret, key: "other-book", name: "Other Book", displayName: "Other Book" };
  const spellRow = { ...spell("other_spell", "Other Book Spell", { documentKey: "other-book" }) };
  await env.DB.batch([
    env.DB.prepare("INSERT INTO documents (key, origin, visibility, name, display_name, game_system, data) VALUES (?, 'private', 'private', ?, ?, ?, ?)").bind(doc.key, doc.name, doc.displayName, doc.gameSystem, JSON.stringify(doc)),
    env.DB.prepare("INSERT INTO spells (id, document_key, name, name_search, level, school, classes, concentration, ritual, casting_time, range_text, data) VALUES (?, ?, ?, ?, 1, 'evocation', '', 0, 0, 'action', '60 feet', ?)").bind(
      spellRow.id, spellRow.documentKey, spellRow.name, foldName(spellRow.name), JSON.stringify(spellRow),
    ),
  ]);
}

/** Adds a private book with the given document key and one invented monster (`<key>_beast`, named "<key> Beast"). */
export async function addBook(key: string): Promise<void> {
  const doc = { ...secret, key, name: key, displayName: key };
  const beast = monster(`${key}_beast`, `${key} Beast`, { documentKey: key });
  await env.DB.batch([
    env.DB.prepare("INSERT INTO documents (key, origin, visibility, name, display_name, game_system, data) VALUES (?, 'private', 'private', ?, ?, ?, ?)").bind(doc.key, doc.name, doc.displayName, doc.gameSystem, JSON.stringify(doc)),
    env.DB.prepare("INSERT INTO monsters (id, document_key, name, name_search, size, type, challenge_rating, armor_class, hit_points, data) VALUES (?, ?, ?, ?, 'medium', 'beast', 1, 10, 10, ?)").bind(beast.id, key, beast.name, foldName(beast.name), JSON.stringify(beast)),
  ]);
}
