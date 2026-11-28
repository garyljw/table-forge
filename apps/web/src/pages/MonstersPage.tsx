import type { MonsterSummary } from "@table-forge/shared";
import { formatChallengeRating } from "@table-forge/core";
import { Link } from "wouter";
import { listMonsters } from "../api/rules.js";
import { coreParam, Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { capitalise, keyOptions, safeCr } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const MONSTER_TYPES = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey",
  "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",
];
export const MONSTER_SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"];
const CR_VALUES = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)];
const CR_OPTIONS = CR_VALUES.map((v) => ({ value: String(v), label: `CR ${formatChallengeRating(v)}` }));

export function monsterApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return {
    q: get("q"),
    type: get("type"),
    size: get("size"),
    crMin: get("crMin"),
    crMax: get("crMax"),
    document: get("document"),
    core: coreParam(params) ? "true" : undefined,
    page: get("page"),
    pageSize: 25,
  };
}

function MonsterRow({ monster, docName }: { monster: MonsterSummary; docName: string | undefined }) {
  return (
    <li>
      <Link className="row" href={`/monsters/${monster.id}`}>
        <span className="row-main">
          <span className="row-name">{monster.name}</span>
          <span className="tag" title="Challenge rating">CR {safeCr(monster.challengeRating).label}</span>
        </span>
        <span className="row-sub">
          {capitalise(monster.size)} {monster.type} · AC {monster.armorClass} · HP {monster.hitPoints}
          {docName && monster.documentKey !== SRD_KEY && ` · ${docName}`}
        </span>
      </Link>
    </li>
  );
}

export function MonstersPage() {
  const { params, update } = useQueryParams();
  const api = monsterApiParams(params);
  const state = useApi((s) => listMonsters(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const hasFilters = ["q", "type", "size", "crMin", "crMax", "document", "core"].some((k) => params.has(k));

  return (
    <section>
      <h1>Monsters</h1>
      <Filters>
        <SearchBox label="Search monsters by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Type" value={params.get("type") ?? ""} options={keyOptions(MONSTER_TYPES)} onChange={(type) => update({ type })} />
        <Select label="Size" value={params.get("size") ?? ""} options={keyOptions(MONSTER_SIZES)} onChange={(size) => update({ size })} />
        <Select label="CR from" value={params.get("crMin") ?? ""} options={CR_OPTIONS} onChange={(crMin) => update({ crMin })} />
        <Select label="CR to" value={params.get("crMax") ?? ""} options={CR_OPTIONS} onChange={(crMax) => update({ crMax })} />
        <SourceFilter kind="monsters" value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
        {hasFilters && (
          <Link className="button-link" href="/monsters" replace>
            Clear filters
          </Link>
        )}
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No monsters match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((m) => (
                  <MonsterRow key={m.id} monster={m} docName={docNames[m.documentKey]} />
                ))}
              </ul>
            )}
          </Results>
        )}
      </Async>
    </section>
  );
}
