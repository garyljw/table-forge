import { z } from "zod";
import { DocumentKey, RecordId, DmOnly } from "./common.js";

export const ArmorCategory = z.enum(["light", "medium", "heavy", "shield"]);
export type ArmorCategory = z.infer<typeof ArmorCategory>;

/** Armour and shields. Small and flat, so the list and the detail share one shape. */
export const Armor = z.object({
  dmOnly: DmOnly,
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  category: ArmorCategory,
  /** Base AC (a shield's bonus, for a shield). */
  acBase: z.number().int().min(0).max(30),
  /** True when the Dexterity modifier is added to the base. */
  addsDexModifier: z.boolean(),
  /** The most Dexterity modifier that counts (2 for medium armour), or null for no cap. */
  dexModifierCap: z.number().int().min(0).nullable(),
  /** Strength score needed to wear it without a speed penalty, or null. */
  strengthRequired: z.number().int().min(0).nullable(),
  stealthDisadvantage: z.boolean(),
  /** The AC as written, e.g. "14 + Dex modifier (max 2)". */
  acDisplay: z.string(),
});
export type Armor = z.infer<typeof Armor>;
export const ArmorSummary = Armor;
export type ArmorSummary = Armor;
