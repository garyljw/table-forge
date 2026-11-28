import { z } from "zod";
import { DocumentKey, RecordId, DmOnly, Supersedes } from "./common.js";

/**
 * A subclass's parent. `id` is null when the source's parent is not a class we store; the subclass
 * is still a subclass, and the name is shown as plain text.
 */
export const ParentClassRef = z.object({ id: z.string().min(1).nullable(), name: z.string().min(1) });
export type ParentClassRef = z.infer<typeof ParentClassRef>;

export const ClassFeature = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  /** Levels at which the feature is gained. Empty for features without a level. */
  levels: z.array(z.number().int().min(1).max(20)),
});
export type ClassFeature = z.infer<typeof ClassFeature>;

/** One column of the class table: proficiency bonus, spell slots, cantrips known, and so on. */
export const ClassTableColumn = z.object({
  name: z.string().min(1),
  kind: z.enum(["proficiencyBonus", "spellSlots", "other"]),
  /** Level (as a string, "1" to "20") to the cell text. */
  values: z.record(z.string(), z.string()),
});
export type ClassTableColumn = z.infer<typeof ClassTableColumn>;

export const ClassSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  /** The parent class, when this is a subclass (archetype). */
  parentClass: ParentClassRef.nullable(),
  /** Hit die, e.g. `D8`. Subclasses usually have none. */
  hitDice: z.string().nullable(),
  /** `FULL`, `HALF`, `THIRD`, `NONE`, or null when the source does not say. */
  casterType: z.string().nullable(),
});
export type ClassSummary = z.infer<typeof ClassSummary>;

export const ClassDetail = ClassSummary.extend({
  dmOnly: DmOnly,
  supersedes: Supersedes,
  description: z.string(),
  hitPoints: z
    .object({
      atFirstLevel: z.string().nullable(),
      atHigherLevels: z.string().nullable(),
    })
    .nullable(),
  savingThrows: z.array(z.string()),
  primaryAbilities: z.array(z.string()),
  /** The "Proficiencies" block, as written. */
  proficiencies: z.string().nullable(),
  /** The "Equipment" block, as written. */
  startingEquipment: z.string().nullable(),
  features: z.array(ClassFeature),
  table: z.array(ClassTableColumn),
});
export type ClassDetail = z.infer<typeof ClassDetail>;
