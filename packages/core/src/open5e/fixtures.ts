// Small hand-written fixtures modelled on Open5e v2 responses. SRD 5.1 text only
// (CC-BY-4.0); "Test Wyrm" is invented to cover the fields the SRD records lack.
import type { RawArmor, RawMagicItem, RawBackground, RawClass, RawCondition, RawCreature, RawDocument, RawFeat, RawSpecies, RawSpell, RawWeapon } from "./raw.js";

export const srdDocument: RawDocument = {
  key: "srd-2014",
  name: "System Reference Document 5.1",
  display_name: "5e 2014 Rules",
  author: "Mike Mearls, Jeremy Crawford, Chris Perkins, and others",
  publisher: { key: "wizards-of-the-coast", name: "Wizards of the Coast" },
  gamesystem: { key: "5e-2014", name: "5th Edition 2014" },
  licenses: [
    { key: "cc-by-40", name: "Creative Commons Attribution 4.0" },
    { key: "ogl-10a", name: "OPEN GAME LICENSE Version 1.0a" },
  ],
  permalink: "https://dnd.wizards.com/resources/systems-reference-document",
  publication_date: "2023-01-23T00:00:00",
};

export const koboldDocument: RawDocument = {
  key: "tob",
  name: "Tome of Beasts",
  display_name: "Tome of Beasts",
  author: "Chris Harris, Dan Dillon",
  publisher: { key: "kobold-press", name: "Kobold Press" },
  gamesystem: { key: "5e-2014", name: "5th Edition 2014" },
  licenses: [{ key: "ogl-10a", name: "OPEN GAME LICENSE Version 1.0a" }],
  permalink: "https://koboldpress.com/tome-of-beasts/",
  publication_date: "2016-01-01T00:00:00",
};

export const fireball: RawSpell = {
  key: "srd_fireball",
  name: "Fireball",
  document: { key: "srd-2014", name: "System Reference Document 5.1", gamesystem: { key: "5e-2014" } },
  desc: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.\r\n",
  higher_level: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
  level: 3,
  school: { key: "evocation", name: "Evocation" },
  classes: [
    { key: "srd_sorcerer", name: "Sorcerer" },
    { key: "srd_wizard", name: "Wizard" },
  ],
  casting_time: "action",
  range_text: "150 feet",
  duration: "instantaneous",
  concentration: false,
  ritual: false,
  verbal: true,
  somatic: true,
  material: true,
  material_specified: "A tiny ball of bat guano and sulfur.",
  material_cost: null,
  material_consumed: false,
  target_type: "point",
  target_count: 1,
  saving_throw_ability: "dexterity",
  attack_roll: false,
  damage_roll: "8d6",
  damage_types: ["fire"],
  shape_type: "sphere",
  shape_size: 20,
  shape_size_unit: "feet",
};

export const detectMagic: RawSpell = {
  key: "srd_detect-magic",
  name: "Detect Magic",
  document: { key: "srd-2014" },
  desc: "For the duration, you sense the presence of magic within 30 feet of you.",
  higher_level: "",
  level: 1,
  school: { key: "divination", name: "Divination" },
  classes: [{ key: "srd_bard", name: "Bard" }],
  casting_time: "action",
  range_text: "Self",
  duration: "concentration, up to 10 minutes",
  concentration: true,
  ritual: true,
  verbal: true,
  somatic: true,
  material: false,
  material_specified: "",
  saving_throw_ability: null,
  damage_roll: "",
  damage_types: [],
  shape_type: null,
  shape_size: null,
};

export const goblin: RawCreature = {
  key: "srd_goblin",
  name: "Goblin",
  document: { key: "srd-2014" },
  type: { key: "humanoid", name: "Humanoid" },
  size: { key: "small", name: "Small" },
  category: "Monsters",
  subcategory: null,
  challenge_rating: 0.25,
  proficiency_bonus: null,
  speed: { unit: "feet", walk: 30 },
  alignment: "neutral evil",
  languages: { as_string: "Common, Goblin" },
  armor_class: 15,
  armor_detail: "leather armor, shield",
  hit_points: 7,
  hit_dice: "2d6",
  experience_points: 50,
  ability_scores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
  saving_throws: {},
  skill_bonuses: { stealth: 6 },
  passive_perception: 9,
  resistances_and_immunities: {
    damage_immunities_display: "",
    damage_resistances_display: "",
    damage_vulnerabilities_display: "",
    condition_immunities_display: "",
  },
  darkvision_range: 60,
  blindsight_range: null,
  tremorsense_range: null,
  truesight_range: null,
  environments: [{ key: "hills", name: "Hills" }],
  traits: [{ name: "Nimble Escape", desc: "The goblin can take the Disengage or Hide action as a bonus action on each of its turns." }],
  actions: [
    {
      name: "Shortbow",
      desc: "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
      action_type: "ACTION",
      order_in_statblock: 2,
      legendary_action_cost: null,
      usage_limits: null,
    },
    {
      name: "Scimitar",
      desc: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
      action_type: "ACTION",
      order_in_statblock: 1,
      legendary_action_cost: null,
      usage_limits: null,
    },
  ],
};

/** Invented, to cover recharge, legendary and bonus actions, spaced hit dice, and missing hit dice. */
export const testWyrm: RawCreature = {
  ...goblin,
  key: "tob_test-wyrm",
  name: "Test Wyrm",
  document: { key: "tob" },
  type: { key: "dragon", name: "Dragon" },
  size: { key: "huge", name: "Huge" },
  subcategory: "Dragons, Test",
  challenge_rating: 17,
  speed: { unit: "feet", walk: 40, fly: 80, hover: true },
  hit_dice: "19d12 + 133",
  armor_detail: "",
  saving_throws: { dexterity: 6, wisdom: 7 },
  resistances_and_immunities: { damage_immunities_display: "fire", damage_resistances_display: "bludgeoning from nonmagical attacks" },
  traits: [],
  actions: [
    { name: "Fire Breath", desc: "Exhales fire.", action_type: "ACTION", order_in_statblock: 1, usage_limits: { type: "RECHARGE_ON_ROLL", param: 5 } },
    { name: "Tail Flick", desc: "A quick swipe.", action_type: "BONUS_ACTION", order_in_statblock: 2, usage_limits: { type: "PER_DAY", param: 3 } },
    { name: "Wing Beat", desc: "Beats its wings.", action_type: "LEGENDARY_ACTION", order_in_statblock: 3, legendary_action_cost: 2, usage_limits: null },
    { name: "Detect", desc: "Makes a Wisdom (Perception) check.", action_type: "LEGENDARY_ACTION", order_in_statblock: 0, legendary_action_cost: null },
    { name: "Parry", desc: "Raises AC.", action_type: "REACTION", order_in_statblock: 4, usage_limits: null },
  ],
};

export const wyrmWithoutHitDice: RawCreature = { ...testWyrm, key: "tob_nameless", name: "Nameless", hit_dice: null };

export const wizard: RawClass = {
  key: "srd_wizard",
  name: "Wizard",
  document: { key: "srd-2014" },
  desc: "",
  hit_dice: "D6",
  caster_type: "FULL",
  subclass_of: null,
  hit_points: { hit_points_at_1st_level: "6 + your Constitution modifier", hit_points_at_higher_levels: "1d6 (or 4) + your Constitution modifier per wizard level after 1st" },
  saving_throws: [{ name: "Intelligence" }, { name: "Wisdom" }],
  primary_abilities: [],
  features: [
    { key: "srd_wizard_spellcasting", name: "Spellcasting", desc: "As a student of arcane magic...", feature_type: "CLASS_LEVEL_FEATURE", gained_at: [{ level: 1 }], data_for_class_table: [] },
    { key: "srd_wizard_arcane-recovery", name: "Arcane Recovery", desc: "You have learned to regain some of your magical energy.", feature_type: "CLASS_LEVEL_FEATURE", gained_at: [{ level: 1 }], data_for_class_table: [] },
    { key: "srd_wizard_ability-score-improvement", name: "Ability Score Improvement", desc: "Increase scores.", feature_type: "CLASS_LEVEL_FEATURE", gained_at: [{ level: 8 }, { level: 4 }], data_for_class_table: [] },
    { key: "srd_wizard_proficiencies", name: "Proficiencies", desc: "**Armor:** None\r\n**Weapons:** Daggers, darts", feature_type: "PROFICIENCIES", gained_at: [], data_for_class_table: [] },
    { key: "srd_wizard_equipment", name: "Equipment", desc: "A quarterstaff or a dagger", feature_type: "STARTING_EQUIPMENT", gained_at: [], data_for_class_table: [] },
    { key: "srd_wizard_slots-1st", name: "1st", desc: "[Column data]", feature_type: "SPELL_SLOTS", gained_at: [], data_for_class_table: [{ level: 1, column_value: "2" }, { level: 2, column_value: "3" }] },
    { key: "srd_wizard_cantrips-known", name: "Cantrips Known", desc: "[Column data]", feature_type: "CLASS_TABLE_DATA", gained_at: [], data_for_class_table: [{ level: 1, column_value: "3" }] },
    { key: "srd_wizard_proficiency-bonus", name: "Proficiency Bonus", desc: "[Column data]", feature_type: "PROFICIENCY_BONUS", gained_at: [], data_for_class_table: [{ level: 1, column_value: "+2" }, { level: 5, column_value: "+3" }] },
  ],
};

export const evocation: RawClass = {
  key: "srd_school-of-evocation",
  name: "School of Evocation",
  document: { key: "srd-2014" },
  desc: "",
  hit_dice: null,
  caster_type: null,
  subclass_of: { key: "srd_wizard", name: "Wizard" },
  saving_throws: [],
  primary_abilities: [],
  features: [{ key: "srd_school-of-evocation_sculpt-spells", name: "Sculpt Spells", desc: "Create pockets of safety.", feature_type: "CLASS_LEVEL_FEATURE", gained_at: [{ level: 2 }], data_for_class_table: [] }],
};

export const blinded: RawCondition = {
  key: "blinded",
  name: "Blinded",
  document: { key: "core", name: "5e Core Concepts" },
  descriptions: [
    { desc: "* A blinded creature can’t see.", document: "a5e-ag", gamesystem: "a5e" },
    { desc: "* A blinded creature can't see and automatically fails any ability check that requires sight.\r\n* Attack rolls against the creature have advantage.", document: "srd-2014", gamesystem: "5e-2014" },
    { desc: "While you have the Blinded condition...", document: "srd-2024", gamesystem: "5e-2024" },
  ],
};

const srdRef = { key: "srd-2014", name: "System Reference Document 5.1", gamesystem: { key: "5e-2014" } };

export const elf: RawSpecies = {
  key: "srd_elf",
  name: "Elf",
  document: srdRef,
  desc: "Elves are a magical people.\r\n",
  is_subspecies: false,
  subspecies_of: null,
  traits: [
    { name: "Darkvision", desc: "**_Darkvision._** You can see in dim light within 60 feet.", type: null },
    { name: "Fey Ancestry", desc: "Advantage on saving throws against being charmed.", type: null },
  ],
};

export const highElf: RawSpecies = {
  key: "srd_high-elf",
  name: "High Elf",
  document: srdRef,
  desc: "",
  is_subspecies: true,
  subspecies_of: "srd_elf",
  traits: [{ name: "Ability Score Increase", desc: "Your Intelligence score increases by 1.", type: null }],
};

export const acolyte: RawBackground = {
  key: "srd_acolyte",
  name: "Acolyte",
  document: srdRef,
  desc: "You have spent your life in service to a temple.",
  benefits: [
    { name: "Shelter of the Faithful", desc: "You command the respect of those who share your faith.", type: "feature" },
    { name: "Skill Proficiencies", desc: "Insight, Religion", type: "skill_proficiency" },
  ],
};

export const grappler: RawFeat = {
  key: "srd_grappler",
  name: "Grappler",
  document: srdRef,
  desc: "You've developed the skills necessary to hold your own in close-quarters grappling.",
  has_prerequisite: true,
  prerequisite: "Strength 13 or higher",
  type: "GENERAL",
  benefits: [{ desc: "You have advantage on attack rolls against a creature you are grappling." }, { desc: "" }],
};

const weapon = (over: Partial<RawWeapon> & Pick<RawWeapon, "key" | "name">): RawWeapon => ({
  document: srdRef,
  damage_dice: "1d8",
  damage_type: { key: "slashing", name: "Slashing" },
  properties: [],
  range: 0,
  long_range: 0,
  distance_unit: "feet",
  is_simple: false,
  is_improvised: false,
  ...over,
});

export const longsword = weapon({
  key: "srd_longsword",
  name: "Longsword",
  properties: [{ property: { name: "Versatile", type: null, desc: "Two-handed damage in parentheses." }, detail: "1d10" }],
});
export const shortbow = weapon({
  key: "srd_shortbow",
  name: "Shortbow",
  is_simple: true,
  damage_dice: "1d6",
  damage_type: { key: "piercing", name: "Piercing" },
  range: 80,
  long_range: 320,
  properties: [
    { property: { name: "Ammunition", type: null, desc: "Needs ammunition." }, detail: "range 80/320" },
    { property: { name: "Two-Handed", type: null, desc: "Two hands." }, detail: null },
  ],
});
export const dagger = weapon({
  key: "srd_dagger",
  name: "Dagger",
  is_simple: true,
  damage_dice: "1d4",
  damage_type: { key: "piercing", name: "Piercing" },
  range: 20,
  long_range: 60,
  properties: [
    { property: { name: "Finesse", type: null, desc: "Str or Dex." }, detail: null },
    { property: { name: "Thrown", type: null, desc: "Can be thrown." }, detail: "range 20/60" },
  ],
});
export const dart = weapon({
  key: "srd_dart",
  name: "Dart",
  is_simple: true,
  damage_dice: "1d4",
  damage_type: { key: "piercing", name: "Piercing" },
  range: 20,
  long_range: 60,
  properties: [{ property: { name: "Thrown", type: null, desc: "Can be thrown." }, detail: "range 20/60" }],
});
export const heavyCrossbow = weapon({
  key: "srd_crossbow-heavy",
  name: "Crossbow, heavy",
  damage_dice: "1d10",
  damage_type: { key: "piercing", name: "Piercing" },
  range: 100,
  long_range: 400,
  properties: [{ property: { name: "Loading", type: null, desc: "One attack per action." }, detail: null }],
});

export const chainMail: RawArmor = {
  key: "srd_chain-mail",
  name: "Chain Mail",
  document: srdRef,
  ac_display: "16",
  category: "heavy",
  grants_stealth_disadvantage: true,
  strength_score_required: 13,
  ac_base: 16,
  ac_add_dexmod: false,
  ac_cap_dexmod: null,
};

export const breastplate: RawArmor = {
  key: "srd_breastplate",
  name: "Breastplate",
  document: srdRef,
  ac_display: "14 + Dex modifier (max 2)",
  category: "medium",
  grants_stealth_disadvantage: false,
  strength_score_required: null,
  ac_base: 14,
  ac_add_dexmod: true,
  ac_cap_dexmod: 2,
};

// Magic items are invented ("Test ..."), shaped like Open5e v2 /magicitems/ records.
export const testBlade: RawMagicItem = {
  key: "srd_blade",
  name: "Test Blade +1",
  document: srdRef,
  desc: "You have a +1 bonus to attack and damage rolls made with this magic weapon.\r\n",
  category: { key: "weapon", name: "Weapon" },
  rarity: { key: "uncommon", name: "Uncommon" },
  weapon: { name: "Longsword" },
  armor: null,
  requires_attunement: false,
  attunement_detail: null,
};

export const testCharm: RawMagicItem = {
  key: "tob_charm",
  name: "Test Charm",
  document: { key: "tob", name: "Tome of Beasts", gamesystem: { key: "5e-2014" } },
  desc: "A charm that hums faintly.",
  category: { key: "wondrous-item", name: "Wondrous Item" },
  rarity: { key: "rare", name: "Rare" },
  weapon: null,
  armor: null,
  requires_attunement: true,
  attunement_detail: "Requires Attunement by a Cleric",
};
