import { Link } from "wouter";
import { listRollTables } from "../api/rules.js";
import { Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { keyOptions, titleKey } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const ROLL_TABLE_CATEGORIES = ["treasure", "encounter", "npc", "madness", "trinket", "dungeon", "other"];

export function rollTableApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), document: get("document"), page: get("page"), pageSize: 30 };
}

export function RollTablesPage() {
  const { params, update } = useQueryParams();
  const api = rollTableApiParams(params);
  const state = useApi((s) => listRollTables(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const hasFilters = ["q", "category", "document"].some((k) => params.has(k));

  return (
    <section>
      <h1>Roll tables</h1>
      <Filters>
        <SearchBox label="Search roll tables by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Category" value={params.get("category") ?? ""} options={keyOptions(ROLL_TABLE_CATEGORIES)} onChange={(category) => update({ category })} />
        <SourceFilter kind="roll_tables" value={params.get("document") ?? ""} update={update} />
        {hasFilters && (
          <Link className="button-link" href="/roll-tables" replace>
            Clear filters
          </Link>
        )}
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No roll tables match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((t) => (
                  <li key={t.id}>
                    <Link className="row" href={`/roll-tables/${t.id}`}>
                      <span className="row-name">{t.name}</span>
                      <span className="row-sub">
                        {titleKey(t.category)} · {t.dice}
                        {docNames[t.documentKey] && t.documentKey !== SRD_KEY && ` · ${docNames[t.documentKey]}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Results>
        )}
      </Async>
    </section>
  );
}
