/**
 * The parts of Open5e's v2 API responses that we read. Deliberately loose: Open5e
 * data is untrusted, so the normaliser's output is validated against the shared
 * schemas, and a record that does not fit is reported rather than trusted.
 */
export interface RawNamed {
  key: string;
  name: string;
}

export interface RawDocumentRef {
  key: string;
  name?: string;
  gamesystem?: { key: string };
}

export interface RawDocument {
  key: string;
  name: string;
  display_name?: string;
  desc?: string;
  author?: string | null;
  publisher: RawNamed;
  gamesystem: RawNamed;
  licenses?: RawNamed[];
  permalink?: string | null;
  publication_date?: string | null;
}

export interface RawSpell {
  key: string;
  name: string;
  document: RawDocumentRef;
  desc?: string | null;
  higher_level?: string | null;
  level: number;
  school: RawNamed;
  classes?: RawNamed[];
  casting_time: string;
  reaction_condition?: string | null;
  range_text?: string | null;
  duration?: string | null;
  concentration?: boolean;
  ritual?: boolean;
  verbal?: boolean;
  somatic?: boolean;
  material?: boolean;
  material_specified?: string | null;
  /** A number in some records, a decimal string such as "25.00" in others. */
  material_cost?: number | string | null;
  material_consumed?: boolean;
  target_type?: string | null;
  target_count?: number | null;
  saving_throw_ability?: string | null;
  attack_roll?: boolean;
  damage_roll?: string | null;
  damage_types?: string[];
  shape_type?: string | null;
  shape_size?: number | null;
  shape_size_unit?: string | null;
}

export interface RawUsageLimits {
  type: string;
  param: number;
}

export interface RawTrait {
  name: string;
  desc?: string | null;
}

export interface RawAction extends RawTrait {
  action_type: string;
  order_in_statblock?: number | null;
  legendary_action_cost?: number | null;
  usage_limits?: RawUsageLimits | null;
}

export interface RawCreature {
  key: string;
  name: string;
  document: RawDocumentRef;
  type: RawNamed;
  size: RawNamed;
  category?: string | null;
  subcategory?: string | null;
  challenge_rating: number;
  proficiency_bonus?: number | null;
  speed: { unit?: string; hover?: boolean; walk?: number; fly?: number; swim?: number; climb?: number; burrow?: number };
  alignment?: string | null;
  languages?: { as_string?: string | null } | null;
  armor_class: number;
  armor_detail?: string | null;
  hit_points: number;
  hit_dice?: string | null;
  experience_points?: number | null;
  ability_scores: Record<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", number>;
  saving_throws?: Record<string, number> | null;
  skill_bonuses?: Record<string, number> | null;
  passive_perception?: number | null;
  resistances_and_immunities?: {
    damage_immunities_display?: string | null;
    damage_resistances_display?: string | null;
    damage_vulnerabilities_display?: string | null;
    condition_immunities_display?: string | null;
  } | null;
  darkvision_range?: number | null;
  blindsight_range?: number | null;
  tremorsense_range?: number | null;
  truesight_range?: number | null;
  environments?: RawNamed[];
  traits?: RawTrait[];
  actions?: RawAction[];
}

export interface RawClassFeature {
  key: string;
  name: string;
  desc?: string | null;
  feature_type: string;
  gained_at?: { level: number }[];
  data_for_class_table?: { level: number; column_value: string }[];
}

export interface RawClass {
  key: string;
  name: string;
  document: RawDocumentRef;
  desc?: string | null;
  hit_dice?: string | null;
  caster_type?: string | null;
  subclass_of?: RawNamed | null;
  hit_points?: { hit_points_at_1st_level?: string | null; hit_points_at_higher_levels?: string | null } | null;
  saving_throws?: { name: string }[];
  primary_abilities?: (string | { name: string })[];
  features?: RawClassFeature[];
}

export interface RawCondition {
  key: string;
  name: string;
  document: RawDocumentRef;
  descriptions: { desc: string; document: string; gamesystem: string }[];
}

export interface RawLicense {
  key: string;
  name: string;
  desc: string;
}

export interface RawSpeciesTrait {
  name: string;
  desc?: string | null;
  type?: string | null;
}

export interface RawSpecies {
  key: string;
  name: string;
  document: RawDocumentRef;
  desc?: string | null;
  is_subspecies?: boolean;
  /** The parent species' key (e.g. `srd_elf`), or null for a base species. */
  subspecies_of?: string | null;
  traits?: RawSpeciesTrait[];
}

export interface RawBackground {
  key: string;
  name: string;
  document: RawDocumentRef;
  desc?: string | null;
  benefits?: { name: string; desc?: string | null; type?: string | null }[];
}

export interface RawFeat {
  key: string;
  name: string;
  document: RawDocumentRef;
  desc?: string | null;
  prerequisite?: string | null;
  has_prerequisite?: boolean;
  type?: string | null;
  benefits?: { desc?: string | null }[];
}

export interface RawWeapon {
  key: string;
  name: string;
  document: RawDocumentRef;
  damage_dice?: string | null;
  damage_type?: { key: string; name?: string } | null;
  properties?: { property: { name: string; type?: string | null; desc?: string | null }; detail?: string | null }[];
  /** Feet. 0 when the weapon has no range. */
  range?: number | null;
  long_range?: number | null;
  distance_unit?: string | null;
  is_simple?: boolean;
  is_improvised?: boolean;
}

export interface RawArmor {
  key: string;
  name: string;
  document: RawDocumentRef;
  ac_display?: string | null;
  category: string;
  grants_stealth_disadvantage?: boolean;
  strength_score_required?: number | null;
  ac_base: number;
  ac_add_dexmod?: boolean;
  ac_cap_dexmod?: number | null;
}

export interface RawMagicItem {
  key: string;
  name: string;
  document: RawDocumentRef;
  desc?: string | null;
  /** `weapon`, `armor`, `wondrous-item`, `potion`, `ring`, and so on. */
  category?: { key: string; name?: string } | null;
  /** Null for some items; we store those as `varies`. */
  rarity?: { key: string; name?: string } | null;
  /** The ordinary weapon or armour this item is a version of, when it is one. */
  weapon?: { name: string } | null;
  armor?: { name: string } | null;
  requires_attunement?: boolean;
  /** For example `requires attunement by a paladin`. */
  attunement_detail?: string | null;
}

/** Most Open5e records name their document with an object; a few (rules, item sets, reference lists) use the bare key. */
export type RawDocumentField = string | RawDocumentRef;

export interface RawRuleset {
  key: string;
  name: string;
  document: RawDocumentField;
  desc?: string | null;
}

export interface RawRule {
  key: string;
  name: string;
  document: RawDocumentField;
  desc?: string | null;
  /** Position within its ruleset, starting at 1. */
  index?: number | null;
  /** The heading level the rule's own title sits at. */
  initialHeaderLevel?: number | null;
  /** Key of the ruleset (chapter) it belongs to. */
  ruleset?: string | null;
}

export interface RawItem {
  key: string;
  name: string;
  document: RawDocumentField;
  desc?: string | null;
  category?: { key: string; name?: string } | null;
  /** Present when the item is a weapon; `key` is the weapon record's key. */
  weapon?: { key: string; name?: string } | null;
  armor?: { key: string; name?: string } | null;
  size?: { key: string; name?: string } | null;
  /** Decimal strings, as Open5e sends them (`"4.000"`, `"10.00"`). */
  weight?: string | number | null;
  weight_unit?: string | null;
  cost?: string | number | null;
}

export interface RawItemSet {
  key: string;
  name: string;
  document: RawDocumentField;
  desc?: string | null;
  items?: { key: string; name?: string }[] | null;
}

/** One description per source document, as conditions have. */
export interface RawDescription {
  desc: string;
  document: string;
  gamesystem?: string;
}

/**
 * Every reference list (abilities, skills, sizes, ...) in one loose shape. Which fields are present depends
 * on the kind; the normaliser reads the ones its kind needs and the shared schema checks the result.
 */
export interface RawReference {
  key: string;
  /** Absent on alignments, which have only a key and a short name. */
  name?: string | null;
  /** Absent on item rarities. */
  document?: RawDocumentField | null;
  desc?: string | null;
  descriptions?: RawDescription[] | null;
  /** Skills: the ability's three-letter key (`dex`). */
  ability?: string | null;
  /** Alignments. */
  morality?: string | null;
  societal_attitude?: string | null;
  short_name?: string | null;
  /** Sizes. */
  rank?: number | null;
  space_diameter?: number | null;
  distance_unit?: string | null;
  suggested_hit_dice?: string | null;
  /** Languages. */
  is_exotic?: boolean | null;
  is_secret?: boolean | null;
  script_language?: string | { key: string } | null;
  /** Environments. */
  aquatic?: boolean | null;
  planar?: boolean | null;
  interior?: boolean | null;
  /** Weapon properties. */
  type?: string | null;
}
