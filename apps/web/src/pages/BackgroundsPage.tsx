import { Link } from "wouter";
import { listBackgrounds } from "../api/rules.js";
import { coreParam, Filters, SearchBox, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export function BackgroundsPage() {
  const { params, update } = useQueryParams();
  const api = {
    q: params.get("q") ?? undefined,
    document: params.get("document") ?? undefined,
    core: coreParam(params) ? "true" : undefined,
    page: params.get("page") ?? undefined,
    pageSize: 30,
  };
  const state = useApi((s) => listBackgrounds(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  return (
    <section>
      <h1>Backgrounds</h1>
      <Filters>
        <SearchBox label="Search backgrounds by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <SourceFilter kind="backgrounds" value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No backgrounds match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((b) => (
                  <li key={b.id}>
                    <Link className="row" href={`/backgrounds/${b.id}`}>
                      <span className="row-name">{b.name}</span>
                      {docNames[b.documentKey] && b.documentKey !== SRD_KEY && <span className="row-sub">{docNames[b.documentKey]}</span>}
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
