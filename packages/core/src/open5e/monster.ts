import type { Monster, MonsterFeature } from "@table-forge/shared";
import type { RawAction, RawCreature, RawTrait } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

function usage(raw: RawAction): MonsterFeature["usage"] {
  const limits = raw.usage_limits;
  if (!limits) return null;
  if (limits.type === "RECHARGE_ON_ROLL") return { kind: "recharge", value: limits.param };
  if (limits.type === "PER_DAY") return { kind: "perDay", value: limits.param };
  return null;
}

function trait(raw: RawTrait): MonsterFeature {
  return { name: cleanText(raw.name), description: cleanText(raw.desc), usage: null, legendaryCost: null };
}

function action(raw: RawAction): MonsterFeature {
  return {
    ...trait(raw),
    usage: usage(raw),
    legendaryCost: raw.action_type === "LEGENDARY_ACTION" ? (raw.legendary_action_cost ?? 1) : null,
  };
}

/** Actions of one kind, in stat block order (Open5e's `order_in_statblock`, then original order). */
function actionsOfType(actions: RawAction[], type: string): MonsterFeature[] {
  return actions
    .map((a, index) => ({ a, index }))
    .filter(({ a }) => a.action_type === type)
    .sort((x, y) => (x.a.order_in_statblock ?? 999) - (y.a.order_in_statblock ?? 999) || x.index - y.index)
    .map(({ a }) => action(a));
}

export function normaliseMonster(raw: RawCreature): Monster {
  const speed = raw.speed;
  if (speed.unit !== undefined && speed.unit !== "feet") throw new Error(`unsupported speed unit "${speed.unit}"`);
  const res = raw.resistances_and_immunities ?? {};
  const actions = raw.actions ?? [];
  const hitDice = (raw.hit_dice ?? "").replace(/\s+/g, "");
  return {
    id: raw.key,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    size: raw.size.key,
    type: raw.type.key,
    challengeRating: raw.challenge_rating,
    armorClass: raw.armor_class,
    hitPoints: raw.hit_points,
    subtype: cleanOrNull(raw.subcategory),
    alignment: cleanText(raw.alignment),
    armorDetail: cleanOrNull(raw.armor_detail),
    hitDice: hitDice === "" ? null : hitDice,
    speed: {
      walk: speed.walk ?? null,
      fly: speed.fly ?? null,
      swim: speed.swim ?? null,
      climb: speed.climb ?? null,
      burrow: speed.burrow ?? null,
      hover: speed.hover ?? false,
      unit: "feet",
    },
    abilityScores: raw.ability_scores,
    savingThrows: raw.saving_throws ?? {},
    skills: raw.skill_bonuses ?? {},
    damageVulnerabilities: cleanText(res.damage_vulnerabilities_display),
    damageResistances: cleanText(res.damage_resistances_display),
    damageImmunities: cleanText(res.damage_immunities_display),
    conditionImmunities: cleanText(res.condition_immunities_display),
    senses: {
      darkvision: raw.darkvision_range ?? null,
      blindsight: raw.blindsight_range ?? null,
      tremorsense: raw.tremorsense_range ?? null,
      truesight: raw.truesight_range ?? null,
      passivePerception: raw.passive_perception ?? null,
    },
    languages: cleanText(raw.languages?.as_string),
    experiencePoints: raw.experience_points ?? null,
    proficiencyBonus: raw.proficiency_bonus ?? null,
    environments: (raw.environments ?? []).map((e) => e.name),
    traits: (raw.traits ?? []).map(trait),
    actions: actionsOfType(actions, "ACTION"),
    bonusActions: actionsOfType(actions, "BONUS_ACTION"),
    reactions: actionsOfType(actions, "REACTION"),
    legendaryActions: actionsOfType(actions, "LEGENDARY_ACTION"),
    // Open5e v2 creatures carry no lair or regional data (only ACTION, BONUS_ACTION, REACTION and
    // LEGENDARY_ACTION action types), so these stay null until a source supplies them.
    lairActions: null,
    regionalEffects: null,
  };
}
