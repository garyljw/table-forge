import { z } from "zod";
import { DmOnly, DocumentKey, RecordId } from "./common.js";

export const RuleChapterSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
});
export type RuleChapterSummary = z.infer<typeof RuleChapterSummary>;

/** A chapter of a rulebook (Open5e calls it a ruleset): an introduction and the rules that follow it. */
export const RuleChapter = RuleChapterSummary.extend({
  dmOnly: DmOnly,
  /** Markdown. Often a short paragraph; may be empty. */
  description: z.string(),
});
export type RuleChapter = z.infer<typeof RuleChapter>;

export const RuleSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  /** The chapter this rule belongs to; null for a rule whose chapter is not stored. */
  chapterId: RecordId.nullable(),
  chapterName: z.string().min(1).nullable(),
});
export type RuleSummary = z.infer<typeof RuleSummary>;

/** One rule: a titled passage of rules text, in a chapter. */
export const Rule = RuleSummary.extend({
  dmOnly: DmOnly,
  /** Position within its chapter, starting at 1. */
  order: z.number().int().min(0),
  /** The heading level (1 to 6) the rule's own title belongs at; the body's headings nest beneath it. */
  headerLevel: z.number().int().min(1).max(6),
  /** Markdown. */
  body: z.string(),
});
export type Rule = z.infer<typeof Rule>;
