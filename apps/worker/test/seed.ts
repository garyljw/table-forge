import { buildImportStatements, foldName, type ImportBundle } from "@table-forge/core";
import type { ClassDetail, Condition, LicenseText, Monster, MonsterFeature, SourceDocument, Spell } from "@table-forge/shared";
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
    ...over,
  };
}

export function klass(id: string, name: string, over: Partial<ClassDetail> = {}): ClassDetail {
  return {
    id,
    documentKey: "srd-2014",
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
  return { id, documentKey: "srd-2014", name, description: `${name} text`, ...over };
}

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
      ...over,
    },
    run,
  );

export async function runStatements(statements: string[]): Promise<void> {
  await env.DB.batch(statements.map((s) => env.DB.prepare(s)));
}

/** Removes everything, then loads the Open5e seed (via the real import SQL) and a private document's rows. */
export async function seedRules(): Promise<void> {
  const clear = ["spells", "monsters", "classes", "conditions", "documents", "licenses"].map((t) => `DELETE FROM ${t};`);
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
  ];
  await env.DB.batch([...clear.map((s) => env.DB.prepare(s)), ...priv]);
  // Open5e rows go in afterwards: the document guard needs the documents to exist, and the
  // private document is not an Open5e one, so its rows are untouched by the import.
  await runStatements(openBundle("run-1"));
}
