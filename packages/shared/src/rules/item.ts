import { z } from "zod";
import { DmOnly, Supersedes, DocumentKey, RecordId } from "./common.js";

/** Item categories (`adventuring-gear`, `weapon`, `armor`, ...) as Open5e keys them. */
export const ItemCategoryKey = z
  .string()
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "must be a lowercase slug");

/** Categories whose items already have their own weapon or armour records, so the Gear list leaves them out. */
export const WEAPON_ARMOR_CATEGORIES = ["weapon", "armor", "shield"] as const;

export const ItemSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  category: ItemCategoryKey,
  /** Cost in gold pieces (0.1 is 1 sp, 0.01 is 1 cp). Zero for items with no listed price. */
  costGp: z.number().min(0),
  /** Weight in pounds; null when the source gives none. */
  weightLb: z.number().min(0).nullable(),
});
export type ItemSummary = z.infer<typeof ItemSummary>;

/** An ordinary (non-magic) item of equipment: gear, tools, trade goods, mounts, vehicles. */
export const Item = ItemSummary.extend({
  dmOnly: DmOnly,
  supersedes: Supersedes,
  /** Markdown. */
  description: z.string(),
  /** The size category Open5e records for the item; not a reliable guide for most gear. */
  size: z.string().min(1).nullable(),
  /** The weapon record for this item, when it is a weapon. */
  weaponId: RecordId.nullable(),
  /** The armour record for this item, when it is armour. */
  armorId: RecordId.nullable(),
});
export type Item = z.infer<typeof Item>;

export const ItemSetSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  itemCount: z.number().int().min(0),
});
export type ItemSetSummary = z.infer<typeof ItemSetSummary>;

/** An equipment pack or a named group of items (arcane focuses, artisan's tools, light armour). */
export const ItemSet = ItemSetSummary.extend({
  dmOnly: DmOnly,
  supersedes: Supersedes,
  /** Markdown. */
  description: z.string(),
  /** The items it holds. Open5e gives no quantities; the description says how many of each. */
  items: z.array(z.object({ id: RecordId, name: z.string().min(1) })),
});
export type ItemSet = z.infer<typeof ItemSet>;
