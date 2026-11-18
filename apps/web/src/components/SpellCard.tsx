import type { Spell } from "@table-forge/shared";
import { Link } from "wouter";
import { capitalise, castingTimeLabel, spellSubtitle, titleKey } from "../format.js";
import { Markdown } from "./Markdown.js";

function componentsText(c: Spell["components"]): string {
  const parts: string[] = [];
  if (c.verbal) parts.push("V");
  if (c.somatic) parts.push("S");
  if (c.material) {
    const detail = c.materialDescription ? ` (${c.materialDescription.replace(/\.$/, "")})` : "";
    parts.push(`M${detail}`);
  }
  return parts.join(", ") || "None";
}

export function SpellCard({ spell }: { spell: Spell }) {
  const time =
    spell.castingTime === "reaction" && spell.reactionCondition
      ? `1 reaction, ${spell.reactionCondition}`
      : castingTimeLabel(spell.castingTime);
  return (
    <article className="card spell-card">
      <h1>{spell.name}</h1>
      <p className="subtitle">
        <em>{capitalise(spellSubtitle(spell.level, spell.school))}</em>
        {spell.ritual && <span className="tag">Ritual</span>}
        {spell.concentration && <span className="tag">Concentration</span>}
      </p>
      <dl className="props">
        <div>
          <dt>Casting time</dt>
          <dd>{time}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>{spell.range}</dd>
        </div>
        <div>
          <dt>Components</dt>
          <dd>
            {componentsText(spell.components)}
            {spell.components.materialCostGp !== null && ` — ${spell.components.materialCostGp} gp`}
            {spell.components.materialConsumed && " (consumed)"}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {spell.concentration ? "Concentration, " : ""}
            {capitalise(spell.duration)}
          </dd>
        </div>
        {spell.classes.length > 0 && (
          <div>
            <dt>Classes</dt>
            <dd>
              {spell.classes.map((c, i) => (
                <span key={c}>
                  {i > 0 && ", "}
                  <Link href={`/spells?class=${encodeURIComponent(c)}`}>{titleKey(c)}</Link>
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <Markdown>{spell.description}</Markdown>
      {spell.higherLevel && (
        <div className="higher">
          <h2>At Higher Levels</h2>
          <Markdown>{spell.higherLevel}</Markdown>
        </div>
      )}
    </article>
  );
}
