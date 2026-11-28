import type { MagicItemSummary } from "@table-forge/shared";
import { Link } from "wouter";
import { listMagicItems } from "../api/rules.js";
import { coreParam, Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { capitalise, keyOptions, rarityLabel, titleKey } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const MAGIC_ITEM_TYPES = ["armor", "potion", "ring", "rod", "scroll", "staff", "wand", "weapon", "wondrous-item"];
export const MAGIC_ITEM_RARITIES = ["common", "uncommon", "rare", "very-rare", "legendary", "artifact", "varies"];
const ATTUNEMENT_OPTIONS = [
  { value: "true", label: "Required" },
  { value: "false", label: "Not required" },
];

export function magicItemApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  const attunement = get("attunement");
  return {
    q: get("q"),
    type: get("type"),
    rarity: get("rarity"),
    attunement: attunement === "true" || attunement === "false" ? attunement : undefined,
    document: get("document"),
    core: coreParam(params) ? "true" : undefined,
    page: get("page"),
    pageSize: 30,
  };
}

function MagicItemRow({ item, docName }: { item: MagicItemSummary; docName: string | undefined }) {
  return (
    <li>
      <Link className="row" href={`/magic-items/${item.id}`}>
        <span className="row-main">
          <span className="row-name">{item.name}</span>
          {item.requiresAttunement && <span className="tag">Attunement</span>}
        </span>
        <span className="row-sub">
          {titleKey(item.type)} · {capitalise(rarityLabel(item.rarity))}
          {docName && item.documentKey !== SRD_KEY && ` · ${docName}`}
        </span>
      </Link>
    </li>
  );
}

export function MagicItemsPage() {
  const { params, update } = useQueryParams();
  const api = magicItemApiParams(params);
  const state = useApi((s) => listMagicItems(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const hasFilters = ["q", "type", "rarity", "attunement", "document", "core"].some((k) => params.has(k));

  return (
    <section>
      <h1>Magic items</h1>
      <Filters>
        <SearchBox label="Search magic items by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Type" value={params.get("type") ?? ""} options={keyOptions(MAGIC_ITEM_TYPES)} onChange={(type) => update({ type })} />
        <Select label="Rarity" value={params.get("rarity") ?? ""} options={keyOptions(MAGIC_ITEM_RARITIES)} onChange={(rarity) => update({ rarity })} />
        <Select label="Attunement" value={params.get("attunement") ?? ""} options={ATTUNEMENT_OPTIONS} onChange={(attunement) => update({ attunement })} />
        <SourceFilter kind="magic_items" value={params.get("document") ?? ""} core={coreParam(params)} update={update} />
        {hasFilters && (
          <Link className="button-link" href="/magic-items" replace>
            Clear filters
          </Link>
        )}
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No magic items match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((m) => (
                  <MagicItemRow key={m.id} item={m} docName={docNames[m.documentKey]} />
                ))}
              </ul>
            )}
          </Results>
        )}
      </Async>
    </section>
  );
}
