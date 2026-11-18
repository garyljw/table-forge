import type { SpellSummary } from "@table-forge/shared";
import { Link } from "wouter";
import { listSpells } from "../api/rules.js";
import { Check, Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { capitalise, keyOptions, spellSubtitle, titleKey } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const SPELL_CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"];
export const SPELL_SCHOOLS = [
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
];
const LEVELS = Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: i === 0 ? "Cantrip" : `Level ${i}` }));

/** The URL parameters that become API filters. Anything else in the URL is ignored. */
export function spellApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return {
    q: get("q"),
    level: get("level"),
    school: get("school"),
    class: get("class"),
    concentration: params.get("concentration") === "true" ? "true" : undefined,
    ritual: params.get("ritual") === "true" ? "true" : undefined,
    document: get("document"),
    page: get("page"),
    pageSize: 25,
  };
}

function SpellRow({ spell, docName }: { spell: SpellSummary; docName: string | undefined }) {
  return (
    <li>
      <Link className="row" href={`/spells/${spell.id}`}>
        <span className="row-main">
          <span className="row-name">{spell.name}</span>
          {spell.concentration && <span className="tag" title="Concentration">C</span>}
          {spell.ritual && <span className="tag" title="Ritual">R</span>}
        </span>
        <span className="row-sub">
          {capitalise(spellSubtitle(spell.level, spell.school))}
          {spell.classes.length > 0 && ` · ${spell.classes.map(titleKey).join(", ")}`}
          {docName && spell.documentKey !== SRD_KEY && ` · ${docName}`}
        </span>
      </Link>
    </li>
  );
}

export function SpellsPage() {
  const { params, update } = useQueryParams();
  const api = spellApiParams(params);
  const state = useApi((s) => listSpells(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const hasFilters = ["q", "level", "school", "class", "concentration", "ritual", "document"].some((k) => params.has(k));

  return (
    <section>
      <h1>Spells</h1>
      <Filters>
        <SearchBox label="Search spells by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Level" value={params.get("level") ?? ""} options={LEVELS} onChange={(level) => update({ level })} />
        <Select label="School" value={params.get("school") ?? ""} options={keyOptions(SPELL_SCHOOLS)} onChange={(school) => update({ school })} />
        <Select label="Class" value={params.get("class") ?? ""} options={keyOptions(SPELL_CLASSES)} onChange={(c) => update({ class: c })} />
        <Check label="Concentration" checked={params.get("concentration") === "true"} onChange={(on) => update({ concentration: on ? "true" : undefined })} />
        <Check label="Ritual" checked={params.get("ritual") === "true"} onChange={(on) => update({ ritual: on ? "true" : undefined })} />
        <SourceFilter kind="spells" value={params.get("document") ?? ""} update={update} />
        {hasFilters && (
          <Link className="button-link" href="/spells" replace>
            Clear filters
          </Link>
        )}
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No spells match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((s) => (
                  <SpellRow key={s.id} spell={s} docName={docNames[s.documentKey]} />
                ))}
              </ul>
            )}
          </Results>
        )}
      </Async>
    </section>
  );
}

