import type { Rule, RuleChapterDetailResponse } from "@table-forge/shared";
import { Markdown } from "./Markdown.js";

/** A rule's title at its own heading level (never h1: the page's chapter title is the h1), with the body's headings nested beneath it. */
export function RuleArticle({ rule }: { rule: Rule }) {
  const level = Math.min(6, Math.max(2, rule.headerLevel));
  const Title = `h${level}` as "h2";
  return (
    <section className="rule" id={rule.id}>
      <Title>{rule.name}</Title>
      <Markdown headingStart={Math.min(6, level + 1)}>{rule.body}</Markdown>
    </section>
  );
}

export function RuleChapterView({ detail }: { detail: RuleChapterDetailResponse }) {
  const chapter = detail.data;
  return (
    <article className="card">
      <h1>{chapter.name}</h1>
      {chapter.description && <Markdown headingStart={2}>{chapter.description}</Markdown>}
      {detail.rules.length === 0 && !chapter.description && <p className="state">This chapter has no text of its own.</p>}
      {detail.rules.map((r) => (
        <RuleArticle key={r.id} rule={r} />
      ))}
    </article>
  );
}
