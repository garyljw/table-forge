import { z } from "zod";
import { Ability } from "./ability.js";

/** Where a number or feature came from. `id` links to a rules record when there is one. */
export const SourceRef = z.object({
  kind: z.enum(["race", "subrace", "class", "subclass", "background", "feat", "item", "manual"]),
  id: z.string().min(1).max(200).nullable(),
  name: z.string().min(1).max(200),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const ProficiencyCategory = z.enum(["save", "skill", "armor", "weapon", "tool", "language"]);
export type ProficiencyCategory = z.infer<typeof ProficiencyCategory>;

const DamageType = z.string().min(1).max(50);

/**
 * What a source gives a character. Later slices will parse race, background and feat text into
 * suggested effects of exactly these shapes.
 */
export const Effect = z.discriminatedUnion("type", [
  z.object({ type: z.literal("abilityBonus"), ability: Ability, amount: z.number().int().min(-10).max(10) }),
  z.object({ type: z.literal("proficiency"), category: ProficiencyCategory, key: z.string().min(1).max(100) }),
  z.object({ type: z.literal("expertise"), skill: z.string().min(1).max(50) }),
  /** Base walking speed; the highest base wins. */
  z.object({ type: z.literal("speed"), feet: z.number().int().min(0).max(300) }),
  z.object({ type: z.literal("speedBonus"), feet: z.number().int().min(-100).max(100) }),
  z.object({ type: z.literal("darkvision"), feet: z.number().int().min(0).max(300) }),
  z.object({ type: z.literal("hpBonusPerLevel"), amount: z.number().int().min(-10).max(10) }),
  z.object({ type: z.literal("acBonus"), amount: z.number().int().min(-10).max(10) }),
  /** 10 + DEX + the listed abilities, when no armour is worn. */
  z.object({
    type: z.literal("unarmoredDefense"),
    abilities: z.array(Ability).max(6),
    /** False for the monk: a shield turns it off. */
    shieldAllowed: z.boolean().default(true),
  }),
  z.object({ type: z.literal("resistance"), damageType: DamageType }),
  /** A non-mechanical feature, shown in "what this gives you". */
  z.object({ type: z.literal("trait"), name: z.string().min(1).max(200), text: z.string().max(5000) }),
]);
export type Effect = z.infer<typeof Effect>;

export const Grant = z.object({
  source: SourceRef,
  effect: Effect,
  note: z.string().max(500).optional(),
});
export type Grant = z.infer<typeof Grant>;
