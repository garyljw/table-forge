import type { RuleSection } from "@table-forge/shared";
import { titleKey } from "../format.js";
import { Markdown } from "./Markdown.js";

export function RuleSectionView({ section: s }: { section: RuleSection }) {
  return (
    <article className="card">
      <h1>{s.name}</h1>
      <p className="subtitle">
        <em>{titleKey(s.category)}</em>
      </p>
      <Markdown>{s.body}</Markdown>
    </article>
  );
}
