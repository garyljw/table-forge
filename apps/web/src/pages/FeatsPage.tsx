import { Link } from "wouter";
import { listFeats } from "../api/rules.js";
import { coreParam, Filters, SearchBox, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export function FeatsPage() {
  const { params, update } = useQueryParams();
  const api = {
    q: params.get("q") ?? undefined,
    document: params.get("document") ?? undefined,
    core: coreParam(params) ? "true" : undefined,
    page: params.get("page") ?? undefined,
    pageSize: 30,
  };
  const state = useApi((s) => listFeats(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  return (
    <section>
      <h1>Feats</h1>
      <Filters>
        <SearchBox label="Search feats by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <SourceFilter kind="feats" value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No feats match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((f) => (
                  <li key={f.id}>
                    <Link className="row" href={`/feats/${f.id}`}>
                      <span className="row-name">{f.name}</span>
                      <span className="row-sub">
                        {f.prerequisite ? `Prerequisite: ${f.prerequisite}` : "No prerequisite"}
                        {docNames[f.documentKey] && f.documentKey !== SRD_KEY && ` · ${docNames[f.documentKey]}`}
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
