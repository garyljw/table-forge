import { z } from "zod";
import { DocumentKey, RecordId, DmOnly } from "./common.js";

/**
 * One racial trait. Open5e traits are free text (ability increases, speed, languages, and so on
 * are all written inside `description`), so they are kept as written and not parsed.
 */
export const SpeciesTrait = z.object({
  name: z.string().min(1),
  description: z.string(),
  /** Open5e's trait type, when it gives one (usually null). */
  type: z.string().nullable(),
});
export type SpeciesTrait = z.infer<typeof SpeciesTrait>;

/** A subspecies's parent. `id` is null when the parent is not a species we store; the name is then shown as plain text. */
export const ParentSpeciesRef = z.object({ id: RecordId.nullable(), name: z.string().min(1) });
export type ParentSpeciesRef = z.infer<typeof ParentSpeciesRef>;

export const SpeciesSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  /** Set for subspecies (subraces). */
  parentSpecies: ParentSpeciesRef.nullable(),
});
export type SpeciesSummary = z.infer<typeof SpeciesSummary>;

export const Species = SpeciesSummary.extend({
  dmOnly: DmOnly,
  description: z.string(),
  traits: z.array(SpeciesTrait),
});
export type Species = z.infer<typeof Species>;
