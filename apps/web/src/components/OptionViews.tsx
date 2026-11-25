import type { Armor, Background, Feat, SpeciesDetailResponse, Weapon } from "@table-forge/shared";
import { Link } from "wouter";
import { capitalise, weaponDamageLabel } from "../format.js";
import { Markdown } from "./Markdown.js";

export function SpeciesView({ detail }: { detail: SpeciesDetailResponse }) {
  const s = detail.data;
  return (
    <article className="card">
      <h1>{s.name}</h1>
      {s.parentSpecies && (
        <p className="subtitle">
          Subrace of{" "}
          {s.parentSpecies.id !== null ? <Link href={`/races/${s.parentSpecies.id}`}>{s.parentSpecies.name}</Link> : s.parentSpecies.name}
        </p>
      )}
      {s.description && <Markdown>{s.description}</Markdown>}
      {s.traits.length > 0 && (
        <>
          <h2>Traits</h2>
          {s.traits.map((t, i) => (
            <div className="feature" key={`${t.name}-${i}`}>
              <h3>{t.name}</h3>
              <Markdown>{t.description}</Markdown>
            </div>
          ))}
        </>
      )}
      {detail.subspecies.length > 0 && (
        <>
          <h2>Subraces</h2>
          <ul className="rows">
            {detail.subspecies.map((x) => (
              <li key={x.id}>
                <Link className="row" href={`/races/${x.id}`}>
                  <span className="row-name">{x.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

export function BackgroundView({ background: b }: { background: Background }) {
  return (
    <article className="card">
      <h1>{b.name}</h1>
      {b.description && <Markdown>{b.description}</Markdown>}
      {b.benefits.map((x, i) => (
        <div className="feature" key={`${x.name}-${i}`}>
          <h3>{x.name}</h3>
          <Markdown>{x.description}</Markdown>
        </div>
      ))}
    </article>
  );
}

export function FeatView({ feat: f }: { feat: Feat }) {
  return (
    <article className="card">
      <h1>{f.name}</h1>
      {f.prerequisite && <p className="subtitle">Prerequisite: {f.prerequisite}</p>}
      {f.description && <Markdown>{f.description}</Markdown>}
      {f.benefits.length > 0 && (
        <ul>
          {f.benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function WeaponView({ weapon: w }: { weapon: Weapon }) {
  return (
    <article className="card">
      <h1>{w.name}</h1>
      <p className="subtitle">
        {capitalise(w.category)} {w.kind} weapon
      </p>
      <dl className="props">
        <div>
          <dt>Damage</dt>
          <dd>
            {weaponDamageLabel(w.damageDice, w.damageType)}
          </dd>
        </div>
        {w.range && (
          <div>
            <dt>Range</dt>
            <dd>
              {w.range.normalFeet}/{w.range.longFeet} ft
            </dd>
          </div>
        )}
      </dl>
      {w.properties.length > 0 && (
        <>
          <h2>Properties</h2>
          {w.properties.map((p, i) => (
            <div className="feature" key={`${p.name}-${i}`}>
              <h3>
                {p.name}
                {p.detail && <span className="muted"> ({p.detail})</span>}
              </h3>
              {p.description && <Markdown>{p.description}</Markdown>}
            </div>
          ))}
        </>
      )}
    </article>
  );
}

export function ArmorView({ armor: a }: { armor: Armor }) {
  return (
    <article className="card">
      <h1>{a.name}</h1>
      <p className="subtitle">{a.category === "shield" ? "Shield" : `${capitalise(a.category)} armor`}</p>
      <dl className="props">
        <div>
          <dt>Armor class</dt>
          <dd>{a.acDisplay}</dd>
        </div>
        {a.strengthRequired !== null && (
          <div>
            <dt>Strength required</dt>
            <dd>{a.strengthRequired}</dd>
          </div>
        )}
        <div>
          <dt>Stealth</dt>
          <dd>{a.stealthDisadvantage ? "Disadvantage" : "No penalty"}</dd>
        </div>
      </dl>
    </article>
  );
}
