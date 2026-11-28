import type { Rule, RuleChapterDetailResponse } from "@table-forge/shared";
import { Markdown } from "./Markdown.js";

/** A rule's title at its own heading level, with the body's headings nested beneath it. */
export function RuleArticle({ rule }: { rule: Rule }) {
  const Title = `h${rule.headerLevel}` as "h1";
  return (
    <section className="rule" id={rule.id}>
      <Title>{rule.name}</Title>
      <Markdown headingStart={Math.min(6, rule.headerLevel + 1)}>{rule.body}</Markdown>
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
