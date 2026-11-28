import { z } from "zod";
import { DocumentKey, RecordId, DmOnly } from "./common.js";

/** One block of a background: a feature, equipment, skill proficiencies, languages and so on, as written. */
export const BackgroundBenefit = z.object({
  name: z.string().min(1),
  description: z.string(),
  /** Open5e's benefit type, e.g. `feature`, `equipment`, `skill_proficiency`, `tool_proficiency`, `language`. */
  type: z.string().nullable(),
});
export type BackgroundBenefit = z.infer<typeof BackgroundBenefit>;

export const BackgroundSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
});
export type BackgroundSummary = z.infer<typeof BackgroundSummary>;

export const Background = BackgroundSummary.extend({
  dmOnly: DmOnly,
  description: z.string(),
  benefits: z.array(BackgroundBenefit),
});
export type Background = z.infer<typeof Background>;
