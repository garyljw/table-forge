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
