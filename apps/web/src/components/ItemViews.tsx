import type { Item, ItemSet } from "@table-forge/shared";
import { Link } from "wouter";
import { costLabel, titleKey, weightLabel } from "../format.js";
import { Markdown } from "./Markdown.js";

export function ItemView({ item: i }: { item: Item }) {
  return (
    <article className="card">
      <h1>{i.name}</h1>
      <p className="subtitle">
        <em>{titleKey(i.category)}</em>
      </p>
      <dl className="props">
        <div>
          <dt>Cost</dt>
          <dd>{costLabel(i.costGp)}</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{weightLabel(i.weightLb)}</dd>
        </div>
      </dl>
      {i.description && <Markdown>{i.description}</Markdown>}
      {i.weaponId && (
        <p>
          <Link href={`/equipment/weapons/${i.weaponId}`}>See the weapon&apos;s damage and properties</Link>
        </p>
      )}
      {i.armorId && (
        <p>
          <Link href={`/equipment/armor/${i.armorId}`}>See the armor&apos;s AC and requirements</Link>
        </p>
      )}
    </article>
  );
}

export function ItemSetView({ set: s }: { set: ItemSet }) {
  return (
    <article className="card">
      <h1>{s.name}</h1>
      {s.description && <Markdown>{s.description}</Markdown>}
      <h2>Contents</h2>
      {s.items.length === 0 ? (
        <p className="state">No items are listed.</p>
      ) : (
        <ul className="rows">
          {s.items.map((i) => (
            <li key={i.id}>
              <Link className="row" href={`/equipment/gear/${i.id}`}>
                <span className="row-name">{i.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
