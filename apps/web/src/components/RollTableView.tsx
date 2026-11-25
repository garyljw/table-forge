import type { RollTable } from "@table-forge/shared";
import { titleKey } from "../format.js";
import { Markdown } from "./Markdown.js";

/** "3", or "4-6" for a row that covers several rolls. */
export function rollLabel(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

export function RollTableView({ table: t }: { table: RollTable }) {
  return (
    <article className="card">
      <h1>{t.name}</h1>
      <p className="subtitle">
        <em>
          {titleKey(t.category)} · {t.dice}
        </em>
      </p>
      {t.description && <Markdown>{t.description}</Markdown>}
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">{t.dice}</th>
              {t.columns.map((c, i) => (
                <th scope="col" key={`${c}-${i}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, ri) => (
              <tr key={`${ri}-${r.min}-${r.max}`}>
                <th scope="row">{rollLabel(r.min, r.max)}</th>
                {r.cells.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
