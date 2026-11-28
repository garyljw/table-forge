import type { ConditionSummary } from "@table-forge/shared";
import { useState } from "react";
import { getCondition, listConditions } from "../api/rules.js";
import { coreParam, Filters, SearchBox, SourceFilter } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Markdown } from "../components/Markdown.js";
import { SourceLine } from "../components/SourceLine.js";
import { Async, ErrorNote, Loading } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

function ConditionBody({ id }: { id: string }) {
  const state = useApi((s) => getCondition(id, s), id);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorNote message={state.message} />;
  return (
    <>
      <Markdown>{state.data.data.description}</Markdown>
      <SourceLine document={state.data.document} />
    </>
  );
}

/** One condition, fetched only when opened. */
function ConditionItem({ condition }: { condition: ConditionSummary }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="condition" onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary>{condition.name}</summary>
      <div className="condition-body">{opened && <ConditionBody id={condition.id} />}</div>
    </details>
  );
}

export function ConditionsPage() {
  const { params, update } = useQueryParams();
  const api = {
    q: params.get("q") ?? undefined,
    document: params.get("document") ?? undefined,
    core: coreParam(params) ? "true" : undefined,
    page: params.get("page") ?? undefined,
    pageSize: 30,
  };
  const state = useApi((s) => listConditions(api, s), JSON.stringify(api));
  return (
    <section>
      <h1>Conditions</h1>
      <Filters>
        <SearchBox label="Search conditions" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <SourceFilter kind="conditions" value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No conditions match." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <div className="conditions">
                {items.map((c) => (
                  <ConditionItem key={c.id} condition={c} />
                ))}
              </div>
            )}
          </Results>
        )}
      </Async>
    </section>
  );
}
