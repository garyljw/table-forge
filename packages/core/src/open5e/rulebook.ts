import type { Rule, RuleChapter } from "@table-forge/shared";
import type { RawRule, RawRuleset } from "./raw.js";
import { cleanText, documentKeyOf } from "./text.js";

function documentKey(raw: { key: string; document: string | { key: string } }): string {
  const key = documentKeyOf(raw.document);
  if (key === null) throw new Error(`record "${raw.key}" has no document`);
  return key;
}

export function normaliseRuleChapter(raw: RawRuleset): RuleChapter {
  return {
    id: raw.key,
    documentKey: documentKey(raw),
    dmOnly: false,
    name: cleanText(raw.name),
    description: cleanText(raw.desc),
  };
}

/** `chapterNames` maps a chapter id to its name, so the rule can say which chapter it is in. A rule whose chapter is unknown has no chapter. */
export function normaliseRule(raw: RawRule, chapterNames: ReadonlyMap<string, string>): Rule {
  const chapterId = raw.ruleset ?? null;
  const chapterName = chapterId === null ? null : (chapterNames.get(chapterId) ?? null);
  const level = raw.initialHeaderLevel ?? 2;
  return {
    id: raw.key,
    documentKey: documentKey(raw),
    dmOnly: false,
    name: cleanText(raw.name),
    // Only a chapter we store is linked; a link to a missing chapter would lead nowhere.
    chapterId: chapterName === null ? null : chapterId,
    chapterName,
    order: raw.index ?? 0,
    headerLevel: Math.min(6, Math.max(1, Math.trunc(level))),
    body: cleanText(raw.desc),
  };
}
