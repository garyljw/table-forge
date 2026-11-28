import { z } from "zod";

/**
 * Stable record ids and document keys: lowercase slugs that start with the source
 * prefix, e.g. `srd_fireball`, `tob_aboleth`, `srd-2014_blinded`.
 * Open5e keys are used as-is; private and homebrew data will use their own prefix.
 */
export const RecordId = z
  .string()
  .max(200)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "must be a lowercase slug");
export type RecordId = z.infer<typeof RecordId>;

export const DocumentKey = RecordId;
export type DocumentKey = z.infer<typeof DocumentKey>;

export const AbilityKey = z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);
export type AbilityKey = z.infer<typeof AbilityKey>;

/** A key/name pair, for things like a spell's classes or a subclass's parent. */
export const NamedRef = z.object({ id: z.string().min(1), name: z.string().min(1) });
export type NamedRef = z.infer<typeof NamedRef>;

/**
 * Marks a record as for the DM's eyes only. DATA ONLY for now: nothing reads it, no API response is
 * filtered or changed by it, and there is no DM role behind it. Everything stays visible while the
 * app is tested; who counts as the DM will be decided per adventure, later. Records stored before the
 * field existed parse as `false`.
 */
export const DmOnly = z.boolean().default(false);

/** The record tables of the rules data. The one list every query and import statement works from. */
export const RULE_TABLES = ["spells", "monsters", "classes", "conditions", "species", "backgrounds", "feats", "weapons", "armor", "magic_items", "roll_tables", "rule_sections", "rule_chapters", "rules", "items", "item_sets", "reference_entries"] as const;
export type RuleTable = (typeof RULE_TABLES)[number];
