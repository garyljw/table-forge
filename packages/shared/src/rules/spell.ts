import { z } from "zod";
import { AbilityKey, DocumentKey, RecordId } from "./common.js";

export const SpellLevel = z.number().int().min(0).max(9);

export const SpellComponents = z.object({
  verbal: z.boolean(),
  somatic: z.boolean(),
  material: z.boolean(),
  /** What the material component is, when the spell has one. */
  materialDescription: z.string().nullable(),
  /** Cost in gp, when the material component has one. */
  materialCostGp: z.number().nullable(),
  materialConsumed: z.boolean(),
});

/** The fields shown in a list, and the ones the list can be filtered on. */
export const SpellSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  level: SpellLevel,
  /** School key, e.g. `evocation`. */
  school: z.string().min(1),
  /** Class slugs that can cast it, e.g. `wizard`. Empty when the source does not say. */
  classes: z.array(z.string().min(1)),
  concentration: z.boolean(),
  ritual: z.boolean(),
  /** Open5e casting time key, e.g. `action`, `bonus-action`, `1minute`. */
  castingTime: z.string().min(1),
  /** Range as written, e.g. `150 feet`. */
  range: z.string(),
});
export type SpellSummary = z.infer<typeof SpellSummary>;

export const Spell = SpellSummary.extend({
  description: z.string(),
  higherLevel: z.string().nullable(),
  /** Duration as written, e.g. `Instantaneous`. */
  duration: z.string(),
  reactionCondition: z.string().nullable(),
  components: SpellComponents,
  attackRoll: z.boolean(),
  savingThrow: AbilityKey.nullable(),
  damageRoll: z.string().nullable(),
  damageTypes: z.array(z.string()),
  area: z.object({ shape: z.string(), sizeFeet: z.number() }).nullable(),
  targetType: z.string().nullable(),
  targetCount: z.number().int().nullable(),
});
export type Spell = z.infer<typeof Spell>;
