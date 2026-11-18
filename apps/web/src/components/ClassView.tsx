import type { ClassDetailResponse } from "@table-forge/shared";
import { Link } from "wouter";
import { capitalise, titleKey } from "../format.js";
import { Markdown } from "./Markdown.js";

const LEVELS = Array.from({ length: 20 }, (_, i) => String(i + 1));

export function ClassView({ detail }: { detail: ClassDetailResponse }) {
  const c = detail.data;
  const isSub = c.parentClass !== null;
  return (
    <article className="card class-view">
      <h1>{c.name}</h1>
      {c.parentClass && (
        <p className="subtitle">
          Subclass of{" "}
          {c.parentClass.id !== null ? <Link href={`/classes/${c.parentClass.id}`}>{c.parentClass.name}</Link> : c.parentClass.name}
        </p>
      )}
      <dl className="props">
        {c.hitDice && (
          <div>
            <dt>Hit die</dt>
            <dd>{c.hitDice.toLowerCase()}</dd>
          </div>
        )}
        {c.hitPoints?.atFirstLevel && (
          <div>
            <dt>HP at 1st level</dt>
            <dd>{c.hitPoints.atFirstLevel}</dd>
          </div>
        )}
        {c.hitPoints?.atHigherLevels && (
          <div>
            <dt>HP at higher levels</dt>
            <dd>{c.hitPoints.atHigherLevels}</dd>
          </div>
        )}
        {c.savingThrows.length > 0 && (
          <div>
            <dt>Saving throws</dt>
            <dd>{c.savingThrows.map(titleKey).join(", ")}</dd>
          </div>
        )}
        {c.primaryAbilities.length > 0 && (
          <div>
            <dt>Primary ability</dt>
            <dd>{c.primaryAbilities.map(titleKey).join(", ")}</dd>
          </div>
        )}
        {c.casterType && c.casterType !== "NONE" && (
          <div>
            <dt>Spellcasting</dt>
            <dd>{capitalise(c.casterType.toLowerCase())} caster</dd>
          </div>
        )}
      </dl>

      {c.description && <Markdown>{c.description}</Markdown>}

      {c.proficiencies && (
        <>
          <h2>Proficiencies</h2>
          <Markdown>{c.proficiencies}</Markdown>
        </>
      )}
      {c.startingEquipment && (
        <>
          <h2>Starting equipment</h2>
          <Markdown>{c.startingEquipment}</Markdown>
        </>
      )}

      {c.table.length > 0 && (
        <>
          <h2>The {c.name}{isSub ? "" : " table"}</h2>
          <div className="table-scroll" tabIndex={0} aria-label={`${c.name} level table, scrolls sideways`}>
            <table className="level-table">
              <thead>
                <tr>
                  <th scope="col">Level</th>
                  {c.table.map((col) => (
                    <th scope="col" key={col.name}>
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((lvl) => (
                  <tr key={lvl}>
                    <th scope="row">{lvl}</th>
                    {c.table.map((col) => (
                      <td key={col.name}>{col.values[lvl] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {c.features.length > 0 && (
        <>
          <h2>Features</h2>
          {c.features.map((f) => (
            <div className="feature" key={f.id}>
              <h3>{f.name}</h3>
              {f.levels.length > 0 && <p className="muted">Level {f.levels.join(", ")}</p>}
              <Markdown>{f.description}</Markdown>
            </div>
          ))}
        </>
      )}

      {detail.subclasses.length > 0 && (
        <>
          <h2>Subclasses</h2>
          <ul className="rows">
            {detail.subclasses.map((s) => (
              <li key={s.id}>
                <Link className="row" href={`/classes/${s.id}`}>
                  <span className="row-name">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
