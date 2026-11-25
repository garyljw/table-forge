import { z } from "zod";
import { DocumentKey, RecordId } from "./common.js";

export const FeatSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  /** The prerequisite as written (e.g. "Strength 13 or higher"), or null when there is none. */
  prerequisite: z.string().nullable(),
});
export type FeatSummary = z.infer<typeof FeatSummary>;

export const Feat = FeatSummary.extend({
  /** Open5e's feat type (e.g. `GENERAL`), when given. */
  category: z.string().nullable(),
  description: z.string(),
  /** The bullet points of what the feat gives, as written. */
  benefits: z.array(z.string()),
});
export type Feat = z.infer<typeof Feat>;
