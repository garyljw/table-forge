import { z } from "zod";
import { DocumentKey, RecordId, DmOnly } from "./common.js";

export const WeaponCategory = z.enum(["simple", "martial"]);
export type WeaponCategory = z.infer<typeof WeaponCategory>;

export const WeaponKind = z.enum(["melee", "ranged"]);
export type WeaponKind = z.infer<typeof WeaponKind>;

export const WeaponProperty = z.object({
  name: z.string().min(1),
  /** Extra detail such as a thrown range ("range 20/60") or a versatile die ("1d10"). */
  detail: z.string().nullable(),
  description: z.string(),
});
export type WeaponProperty = z.infer<typeof WeaponProperty>;

export const WeaponSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  category: WeaponCategory,
  kind: WeaponKind,
  /** As Open5e gives it: "1d8", or a flat "1" (blowgun) or "0" (net). */
  damageDice: z.string().min(1),
  /** Damage type slug, e.g. `slashing`; null when the source gives none. */
  damageType: z.string().min(1).nullable(),
});
export type WeaponSummary = z.infer<typeof WeaponSummary>;

export const Weapon = WeaponSummary.extend({
  dmOnly: DmOnly,
  /** An improvised weapon (no SRD 5.1 entry is one). */
  improvised: z.boolean(),
  /** Ammunition or thrown range in feet; null for a melee-only weapon. */
  range: z.object({ normalFeet: z.number().int().min(0), longFeet: z.number().int().min(0) }).nullable(),
  properties: z.array(WeaponProperty),
});
export type Weapon = z.infer<typeof Weapon>;
