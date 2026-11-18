import type { ClassDetail, ClassTableColumn } from "@table-forge/shared";
import type { RawClass, RawClassFeature } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

const TABLE_KINDS: Record<string, ClassTableColumn["kind"]> = {
  PROFICIENCY_BONUS: "proficiencyBonus",
  SPELL_SLOTS: "spellSlots",
  CLASS_TABLE_DATA: "other",
};
const KIND_ORDER: Record<ClassTableColumn["kind"], number> = { proficiencyBonus: 0, other: 1, spellSlots: 2 };

function column(f: RawClassFeature, kind: ClassTableColumn["kind"]): ClassTableColumn {
  const values: Record<string, string> = {};
  for (const cell of f.data_for_class_table ?? []) values[String(cell.level)] = cell.column_value;
  return { name: cleanText(f.name), kind, values };
}

function levels(f: RawClassFeature): number[] {
  return [...new Set((f.gained_at ?? []).map((g) => g.level))].sort((a, b) => a - b);
}

export function normaliseClass(raw: RawClass): ClassDetail {
  const features = raw.features ?? [];
  const table = features
    .filter((f) => f.feature_type in TABLE_KINDS)
    .map((f, index) => ({ col: column(f, TABLE_KINDS[f.feature_type] ?? "other"), index }))
    .sort((a, b) => KIND_ORDER[a.col.kind] - KIND_ORDER[b.col.kind] || a.index - b.index)
    .map(({ col }) => col);
  const proficiencies = features.find((f) => f.feature_type === "PROFICIENCIES");
  const equipment = features.find((f) => f.feature_type === "STARTING_EQUIPMENT");
  const described = features
    .filter((f) => !(f.feature_type in TABLE_KINDS) && f.feature_type !== "PROFICIENCIES" && f.feature_type !== "STARTING_EQUIPMENT")
    .map((f) => ({ id: f.key, name: cleanText(f.name), description: cleanText(f.desc), levels: levels(f) }))
    .sort((a, b) => (a.levels[0] ?? 99) - (b.levels[0] ?? 99) || a.name.localeCompare(b.name));
  const hp = raw.hit_points;
  return {
    id: raw.key,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    parentClass: raw.subclass_of ? { id: raw.subclass_of.key, name: raw.subclass_of.name } : null,
    hitDice: cleanOrNull(raw.hit_dice),
    casterType: cleanOrNull(raw.caster_type),
    description: cleanText(raw.desc),
    hitPoints: hp
      ? { atFirstLevel: cleanOrNull(hp.hit_points_at_1st_level), atHigherLevels: cleanOrNull(hp.hit_points_at_higher_levels) }
      : null,
    savingThrows: (raw.saving_throws ?? []).map((s) => s.name),
    primaryAbilities: (raw.primary_abilities ?? []).map((a) => (typeof a === "string" ? a : a.name)),
    proficiencies: proficiencies ? cleanOrNull(proficiencies.desc) : null,
    startingEquipment: equipment ? cleanOrNull(equipment.desc) : null,
    features: described,
    table,
  };
}
