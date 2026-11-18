import { Link } from "wouter";
import { listClasses } from "../api/rules.js";
import { Filters, SearchBox, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

const KIND_OPTIONS = [
  { value: "subclass", label: "Subclasses" },
  { value: "all", label: "Classes and subclasses" },
];

/** Base classes by default; `kind=all` in the URL means no kind filter. */
export function classKind(params: URLSearchParams): "" | "subclass" | "all" {
  const k = params.get("kind");
  return k === "subclass" || k === "all" ? k : "";
}

export function classApiParams(params: URLSearchParams) {
  const kind = classKind(params);
  return {
    q: params.get("q") ?? undefined,
    kind: kind === "all" ? undefined : kind === "subclass" ? "subclass" : "class",
    document: params.get("document") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: 30,
  };
}

export function ClassesPage() {
  const { params, update } = useQueryParams();
  const api = classApiParams(params);
  const state = useApi((s) => listClasses(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const kindValue = classKind(params);

  return (
    <section>
      <h1>Classes</h1>
      <Filters>
        <SearchBox label="Search classes by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <label className="field">
          <span>Show</span>
          <select value={kindValue} onChange={(e) => update({ kind: e.target.value })}>
            <option value="">Classes</option>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <SourceFilter kind="classes" value={params.get("document") ?? ""} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No classes match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((c) => (
                  <li key={c.id}>
                    <Link className="row" href={`/classes/${c.id}`}>
                      <span className="row-main">
                        <span className="row-name">{c.name}</span>
                        {c.hitDice && <span className="tag">{c.hitDice.toLowerCase()}</span>}
                      </span>
                      <span className="row-sub">
                        {c.parentClass ? `Subclass of ${c.parentClass.name}` : "Class"}
                        {docNames[c.documentKey] && c.documentKey !== SRD_KEY && ` · ${docNames[c.documentKey]}`}
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

