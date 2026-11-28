import { REFERENCE_KINDS, type ReferenceKind } from "@table-forge/shared";
import { Link } from "wouter";
import { listReference } from "../api/rules.js";
import { coreParam, Filters, SearchBox, SourceFilter } from "../components/FilterBar.js";
import { ReferenceEntryView } from "../components/ReferenceView.js";
import { Results } from "../components/Results.js";
import { SourceNote } from "../components/SourceNote.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const REFERENCE_KIND_LABELS: Record<ReferenceKind, string> = {
  ability: "Abilities",
  skill: "Skills",
  "creature-type": "Creature types",
  "damage-type": "Damage types",
  alignment: "Alignments",
  "spell-school": "Schools of magic",
  size: "Sizes",
  "item-rarity": "Item rarities",
  "item-category": "Item categories",
  language: "Languages",
  environment: "Environments",
  "weapon-property": "Weapon properties",
};

export function referenceKind(params: URLSearchParams): ReferenceKind {
  const kind = params.get("kind");
  return (REFERENCE_KINDS as readonly string[]).includes(kind ?? "") ? (kind as ReferenceKind) : "ability";
}

export function referenceApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { kind: referenceKind(params), q: get("q"), document: get("document"), core: coreParam(params) ? "true" : undefined, page: get("page"), pageSize: 100 };
}

function Tabs({ kind }: { kind: ReferenceKind }) {
  return (
    <div className="tabs" role="tablist" aria-label="Kind of reference">
      {REFERENCE_KINDS.map((k) => (
        <Link
          key={k}
          href={k === "ability" ? "/reference" : `/reference?kind=${k}`}
          replace
          role="tab"
          aria-selected={kind === k}
          className={kind === k ? "active" : undefined}
        >
          {REFERENCE_KIND_LABELS[k]}
        </Link>
      ))}
    </div>
  );
}

export function ReferencePage() {
  const { params, update } = useQueryParams();
  const kind = referenceKind(params);
  const api = referenceApiParams(params);
  const state = useApi((s) => listReference(api, s), JSON.stringify(api));
  return (
    <section>
      <h1>Reference</h1>
      <p>The game&apos;s own terms, with what the rules say about each.</p>
      <Tabs kind={kind} />
      <Filters>
        <SearchBox label={`Search ${REFERENCE_KIND_LABELS[kind].toLowerCase()} by name`} value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <SourceFilter kind="reference_entries" showCounts={false} value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <>
            <Results data={data} empty={`No ${REFERENCE_KIND_LABELS[kind].toLowerCase()} match those filters.`} onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
              {(items) => (
                <>
                  {items.map((e) => (
                    <ReferenceEntryView key={e.id} entry={e} />
                  ))}
                </>
              )}
            </Results>
            <SourceNote documentKeys={data.items.map((e) => e.documentKey)} />
          </>
        )}
      </Async>
    </section>
  );
}
