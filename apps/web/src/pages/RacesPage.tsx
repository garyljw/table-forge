import { Link } from "wouter";
import { listSpecies } from "../api/rules.js";
import { coreParam, Filters, SearchBox, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

/** Base races by default; `kind=subrace` is subraces only and `kind=all` means no filter. */
export function raceKind(params: URLSearchParams): "" | "subrace" | "all" {
  const k = params.get("kind");
  return k === "subrace" || k === "all" ? k : "";
}

export function raceApiParams(params: URLSearchParams) {
  const kind = raceKind(params);
  return {
    q: params.get("q") ?? undefined,
    kind: kind === "all" ? undefined : kind === "subrace" ? "subspecies" : "species",
    document: params.get("document") ?? undefined,
    core: coreParam(params) ? "true" : undefined,
    page: params.get("page") ?? undefined,
    pageSize: 30,
  };
}

export function RacesPage() {
  const { params, update } = useQueryParams();
  const api = raceApiParams(params);
  const state = useApi((s) => listSpecies(api, s), JSON.stringify(api));
  const docNames = useDocNames();

  return (
    <section>
      <h1>Races</h1>
      <Filters>
        <SearchBox label="Search races by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <label className="field">
          <span>Show</span>
          <select value={raceKind(params)} onChange={(e) => update({ kind: e.target.value })}>
            <option value="">Races</option>
            <option value="subrace">Subraces</option>
            <option value="all">Races and subraces</option>
          </select>
        </label>
        <SourceFilter kind="species" value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No races match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((s) => (
                  <li key={s.id}>
                    <Link className="row" href={`/races/${s.id}`}>
                      <span className="row-main">
                        <span className="row-name">{s.name}</span>
                      </span>
                      <span className="row-sub">
                        {s.parentSpecies ? `Subrace of ${s.parentSpecies.name}` : "Race"}
                        {docNames[s.documentKey] && s.documentKey !== SRD_KEY && ` · ${docNames[s.documentKey]}`}
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
