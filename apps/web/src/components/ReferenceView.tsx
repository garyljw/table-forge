import type { ReferenceEntry } from "@table-forge/shared";
import { titleKey } from "../format.js";
import { Markdown } from "./Markdown.js";

/** The short facts that go with an entry, beyond its description. Empty for kinds that have none. */
export function referenceFacts(e: ReferenceEntry): string[] {
  switch (e.kind) {
    case "ability":
      return [e.abbreviation.toUpperCase()];
    case "skill":
      return [titleKey(e.ability)];
    case "alignment":
      return [e.shortName, `${titleKey(e.societalAttitude)} ${e.morality}`];
    case "size":
      return [`Space ${e.spaceFeet} ft.`, `Hit die ${e.hitDie}`];
    case "item-rarity":
      return [`Rank ${e.rank}`];
    case "language":
      return [e.exotic ? "Exotic" : "Standard", ...(e.secret ? ["Secret"] : []), ...(e.script ? [`Script: ${titleKey(e.script)}`] : [])];
    case "environment":
      return [...(e.aquatic ? ["Aquatic"] : []), ...(e.planar ? ["Planar"] : []), ...(e.interior ? ["Interior"] : [])];
    case "weapon-property":
      return e.propertyType ? [e.propertyType] : [];
    default:
      return [];
  }
}

export function ReferenceEntryView({ entry: e }: { entry: ReferenceEntry }) {
  const facts = referenceFacts(e);
  return (
    <article className="card" id={e.id}>
      <h2>{e.name}</h2>
      {facts.length > 0 && (
        <p className="subtitle">
          {facts.map((f) => (
            <span className="tag" key={f}>
              {f}
            </span>
          ))}
        </p>
      )}
      {e.description ? <Markdown headingStart={3}>{e.description}</Markdown> : <p className="state">No description in the source.</p>}
    </article>
  );
}
