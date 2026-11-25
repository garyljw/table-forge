import { Link } from "wouter";
import { listArmor, listWeapons } from "../api/rules.js";
import { Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { capitalise, keyOptions, weaponDamageLabel } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const DAMAGE_TYPES = ["bludgeoning", "piercing", "slashing"];

/** Weapons by default; `tab=armor` shows armour. */
export function equipmentTab(params: URLSearchParams): "weapons" | "armor" {
  return params.get("tab") === "armor" ? "armor" : "weapons";
}

export function weaponApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), kind: get("kind"), damageType: get("damageType"), document: get("document"), page: get("page"), pageSize: 40 };
}

export function armorApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), document: get("document"), page: get("page"), pageSize: 40 };
}

function Tabs({ tab }: { tab: "weapons" | "armor" }) {
  return (
    <div className="tabs" role="tablist" aria-label="Equipment type">
      <Link href="/equipment" replace role="tab" aria-selected={tab === "weapons"} className={tab === "weapons" ? "active" : undefined}>
        Weapons
      </Link>
      <Link href="/equipment?tab=armor" replace role="tab" aria-selected={tab === "armor"} className={tab === "armor" ? "active" : undefined}>
        Armor
      </Link>
    </div>
  );
}

function WeaponsList() {
  const { params, update } = useQueryParams();
  const api = weaponApiParams(params);
  const state = useApi((s) => listWeapons(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  return (
    <>
      <Filters>
        <SearchBox label="Search weapons by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Category" value={params.get("category") ?? ""} options={keyOptions(["simple", "martial"])} onChange={(category) => update({ category })} />
        <Select label="Kind" value={params.get("kind") ?? ""} options={keyOptions(["melee", "ranged"])} onChange={(kind) => update({ kind })} />
        <Select label="Damage type" value={params.get("damageType") ?? ""} options={keyOptions(DAMAGE_TYPES)} onChange={(damageType) => update({ damageType })} />
        <SourceFilter kind="weapons" value={params.get("document") ?? ""} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No weapons match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((w) => (
                  <li key={w.id}>
                    <Link className="row" href={`/equipment/weapons/${w.id}`}>
                      <span className="row-main">
                        <span className="row-name">{w.name}</span>
                        <span className="tag">{weaponDamageLabel(w.damageDice, w.damageType)}</span>
                      </span>
                      <span className="row-sub">
                        {capitalise(w.category)} {w.kind}
                        {docNames[w.documentKey] && w.documentKey !== SRD_KEY && ` · ${docNames[w.documentKey]}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Results>
        )}
      </Async>
    </>
  );
}

function ArmorList() {
  const { params, update } = useQueryParams();
  const api = armorApiParams(params);
  const state = useApi((s) => listArmor(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  return (
    <>
      <Filters>
        <SearchBox label="Search armor by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select label="Category" value={params.get("category") ?? ""} options={keyOptions(["light", "medium", "heavy", "shield"])} onChange={(category) => update({ category })} />
        <SourceFilter kind="armor" value={params.get("document") ?? ""} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No armor matches those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((a) => (
                  <li key={a.id}>
                    <Link className="row" href={`/equipment/armor/${a.id}`}>
                      <span className="row-main">
                        <span className="row-name">{a.name}</span>
                        <span className="tag">AC {a.acBase}</span>
                      </span>
                      <span className="row-sub">
                        {capitalise(a.category)} · {a.acDisplay}
                        {docNames[a.documentKey] && a.documentKey !== SRD_KEY && ` · ${docNames[a.documentKey]}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Results>
        )}
      </Async>
    </>
  );
}

export function EquipmentPage() {
  const { params } = useQueryParams();
  const tab = equipmentTab(params);
  return (
    <section>
      <h1>Equipment</h1>
      <Tabs tab={tab} />
      {tab === "weapons" ? <WeaponsList /> : <ArmorList />}
    </section>
  );
}
