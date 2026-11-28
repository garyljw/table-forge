import { Link } from "wouter";
import { listRuleChapters, listRules } from "../api/rules.js";
import { coreParam, Filters, SearchBox, SourceFilter } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { SourceNote } from "../components/SourceNote.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export function rulebookApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), document: get("document"), core: coreParam(params) ? "true" : undefined, page: get("page"), pageSize: 50 };
}

function Chapters({ params, update }: { params: URLSearchParams; update: ReturnType<typeof useQueryParams>["update"] }) {
  const api = rulebookApiParams(params);
  const state = useApi((s) => listRuleChapters(api, s), JSON.stringify(api));
  return (
    <Async state={state}>
      {(data) => (
        <>
          <Results data={data} empty="No chapters match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((c) => (
                  <li key={c.id}>
                    <Link className="row" href={`/rulebook/${c.id}`}>
                      <span className="row-name">{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Results>
          <SourceNote documentKeys={data.items.map((c) => c.documentKey)} />
        </>
      )}
    </Async>
  );
}

/** With a search term the page lists matching rules (by name) instead of chapters. */
function RuleMatches({ params, update }: { params: URLSearchParams; update: ReturnType<typeof useQueryParams>["update"] }) {
  const api = rulebookApiParams(params);
  const state = useApi((s) => listRules(api, s), JSON.stringify(api));
  return (
    <Async state={state}>
      {(data) => (
        <>
          <Results data={data} empty="No rules match that search." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((r) => (
                  <li key={r.id}>
                    {r.chapterId !== null ? (
                      <Link className="row" href={`/rulebook/${r.chapterId}#${r.id}`}>
                        <span className="row-name">{r.name}</span>
                        {r.chapterName && <span className="row-sub">{r.chapterName}</span>}
                      </Link>
                    ) : (
                      <span className="row">
                        <span className="row-name">{r.name}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Results>
          <SourceNote documentKeys={data.items.map((r) => r.documentKey)} />
        </>
      )}
    </Async>
  );
}

export function RulebookPage() {
  const { params, update } = useQueryParams();
  const searching = (params.get("q") ?? "") !== "";
  const hasFilters = ["q", "document", "core"].some((k) => params.has(k));
  return (
    <section>
      <h1>Rulebook</h1>
      <p>The rules text of the SRD, chapter by chapter. Search finds a rule by name.</p>
      <Filters>
        <SearchBox label="Search rules by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <SourceFilter kind={searching ? "rules" : "rule_chapters"} value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
        {hasFilters && (
          <Link className="button-link" href="/rulebook" replace>
            Clear filters
          </Link>
        )}
      </Filters>
      {searching ? <RuleMatches params={params} update={update} /> : <Chapters params={params} update={update} />}
    </section>
  );
}
