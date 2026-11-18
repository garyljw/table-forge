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

export interface ParentResolution {
  classes: ClassDetail[];
  /** Subclasses whose parent id was pointed at a class that exists in the data. */
  remapped: number;
  /** Subclasses whose parent could not be found; they keep the parent's name and get a null parent id. */
  unresolved: ClassDetail[];
}

/**
 * A subclass's parent id must be the id of a class we actually store. Open5e sometimes points at a class
 * from a document we do not include (for example `srd-2024_wizard`), so match the parent by name to a
 * stored base class instead. When no single base class matches, the subclass stays a subclass but its parent id becomes null.
 */
export function resolveSubclassParents(classes: readonly ClassDetail[]): ParentResolution {
  const ids = new Set(classes.map((c) => c.id));
  const bases = classes.filter((c) => c.parentClass === null);
  let remapped = 0;
  const unresolved: ClassDetail[] = [];
  const out = classes.map((c) => {
    const parent = c.parentClass;
    if (parent === null || parent.id === null || ids.has(parent.id)) return c;
    const slug = parent.id.slice(parent.id.indexOf("_") + 1);
    const named = bases.filter((b) => b.name.toLowerCase() === parent.name.toLowerCase());
    const match = named.length === 1 ? named[0] : named.find((b) => b.id.endsWith(`_${slug}`));
    if (match) {
      remapped++;
      return { ...c, parentClass: { id: match.id, name: match.name } };
    }
    // Still a subclass: the parent keeps its name but has no id, so it is shown as text and never linked.
    const orphan = { ...c, parentClass: { id: null, name: parent.name } };
    unresolved.push(orphan);
    return orphan;
  });
  return { classes: out, remapped, unresolved };
}
