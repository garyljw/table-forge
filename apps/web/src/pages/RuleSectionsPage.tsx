import { Link } from "wouter";
import { listRuleSections } from "../api/rules.js";
import { Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { keyOptions, titleKey } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const RULE_SECTION_CATEGORIES = ["optional-rule", "variant-rule", "sidebar", "hazard", "trap", "disease", "poison", "lore", "other"];

export function ruleSectionApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), document: get("document"), page: get("page"), pageSize: 30 };
}

export function RuleSectionsPage() {
  const { params, update } = useQueryParams();
  const api = ruleSectionApiParams(params);
  const state = useApi((s) => listRuleSections(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const hasFilters = ["q", "category", "document"].some((k) => params.has(k));

  return (
    <section>
      <h1>Rules sections</h1>
      <Filters>
        <SearchBox label="Search rules sections by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Category" value={params.get("category") ?? ""} options={keyOptions(RULE_SECTION_CATEGORIES)} onChange={(category) => update({ category })} />
        <SourceFilter kind="rule_sections" value={params.get("document") ?? ""} update={update} />
        {hasFilters && (
          <Link className="button-link" href="/rules" replace>
            Clear filters
          </Link>
        )}
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No rules sections match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((t) => (
                  <li key={t.id}>
                    <Link className="row" href={`/rules/${t.id}`}>
                      <span className="row-name">{t.name}</span>
                      <span className="row-sub">
                        {titleKey(t.category)}
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
