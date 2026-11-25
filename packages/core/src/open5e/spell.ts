import type { Spell } from "@table-forge/shared";
import type { RawSpell } from "./raw.js";
import { cleanOrNull, cleanText, slugify } from "./text.js";

const FEET_UNITS = new Set(["feet", "foot", "ft", "ft."]);

function parseCost(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`bad material cost "${value}"`);
  return n;
}

export function normaliseSpell(raw: RawSpell): Spell {
  const shapeSize = raw.shape_size ?? null;
  const area =
    raw.shape_type && shapeSize !== null && FEET_UNITS.has((raw.shape_size_unit ?? "feet").toLowerCase())
      ? { shape: raw.shape_type, sizeFeet: shapeSize }
      : null;
  return {
    id: raw.key,
    dmOnly: false,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    level: raw.level,
    school: raw.school.key,
    classes: [...new Set((raw.classes ?? []).map((c) => slugify(c.name)))],
    concentration: raw.concentration ?? false,
    ritual: raw.ritual ?? false,
    castingTime: raw.casting_time,
    range: cleanText(raw.range_text),
    description: cleanText(raw.desc),
    higherLevel: cleanOrNull(raw.higher_level),
    duration: cleanText(raw.duration),
    reactionCondition: cleanOrNull(raw.reaction_condition),
    components: {
      verbal: raw.verbal ?? false,
      somatic: raw.somatic ?? false,
      material: raw.material ?? false,
      materialDescription: cleanOrNull(raw.material_specified),
      materialCostGp: parseCost(raw.material_cost),
      materialConsumed: raw.material_consumed ?? false,
    },
    attackRoll: raw.attack_roll ?? false,
    savingThrow: (cleanOrNull(raw.saving_throw_ability) as Spell["savingThrow"]) ?? null,
    damageRoll: cleanOrNull(raw.damage_roll),
    damageTypes: raw.damage_types ?? [],
    area,
    targetType: cleanOrNull(raw.target_type),
    targetCount: raw.target_count ?? null,
  };
}
