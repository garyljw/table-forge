import { z } from "zod";
import { DmOnly, Supersedes, DocumentKey, RecordId } from "./common.js";

export const RuleSectionCategory = z.enum(["optional-rule", "variant-rule", "sidebar", "hazard", "trap", "disease", "poison", "lore", "other"]);
export type RuleSectionCategory = z.infer<typeof RuleSectionCategory>;

export const RuleSectionSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  category: RuleSectionCategory,
});
export type RuleSectionSummary = z.infer<typeof RuleSectionSummary>;

/** A piece of rules text that is not a spell, monster or the like: a variant rule, a trap, a sidebar. */
export const RuleSection = RuleSectionSummary.extend({
  dmOnly: DmOnly,
  supersedes: Supersedes,
  /** Ids of records this section relates to (a subclass, a monster, another section). Not checked to exist. */
  relatedIds: z.array(RecordId).default([]),
  /** Markdown. */
  body: z.string(),
});
export type RuleSection = z.infer<typeof RuleSection>;
