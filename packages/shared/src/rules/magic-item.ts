import { z } from "zod";
import { DocumentKey, RecordId, DmOnly, Supersedes } from "./common.js";

/** What kind of item it is. Shields count as `armor` and ammunition as `weapon`. */
export const MagicItemType = z.enum(["armor", "potion", "ring", "rod", "scroll", "staff", "wand", "weapon", "wondrous-item"]);
export type MagicItemType = z.infer<typeof MagicItemType>;

/** `varies` is for items sold in several rarities (a +1, +2 or +3 weapon, say). */
export const MagicItemRarity = z.enum(["common", "uncommon", "rare", "very-rare", "legendary", "artifact", "varies"]);
export type MagicItemRarity = z.infer<typeof MagicItemRarity>;

export const MagicItemSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  type: MagicItemType,
  rarity: MagicItemRarity,
  requiresAttunement: z.boolean(),
});
export type MagicItemSummary = z.infer<typeof MagicItemSummary>;

export const MagicItem = MagicItemSummary.extend({
  dmOnly: DmOnly,
  supersedes: Supersedes,
  /** The ordinary item it is a version of, as written: `longsword`, `any medium armor`. Null for items with no base. */
  baseItem: z.string().nullable(),
  /** Who may attune, as written: `by a cleric`. Null when anyone may, or when no attunement is needed. */
  attunementDetail: z.string().nullable(),
  /** Markdown. */
  description: z.string(),
  sentient: z.boolean(),
  cursed: z.boolean(),
});
export type MagicItem = z.infer<typeof MagicItem>;
