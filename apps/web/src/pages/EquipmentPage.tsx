import { WEAPON_ARMOR_CATEGORIES } from "@table-forge/shared";
import { Link } from "wouter";
import { listArmor, listItems, listItemSets, listWeapons } from "../api/rules.js";
import { Check, Filters, SearchBox, Select, SourceFilter, SRD_KEY } from "../components/FilterBar.js";
import { Results } from "../components/Results.js";
import { Async } from "../components/States.js";
import { capitalise, costLabel, keyOptions, titleKey, weaponDamageLabel, weightLabel } from "../format.js";
import { useApi } from "../hooks/useApi.js";
import { useDocNames } from "../hooks/useDocNames.js";
import { useQueryParams } from "../hooks/useQueryParams.js";

export const DAMAGE_TYPES = ["bludgeoning", "piercing", "slashing"];

export type EquipmentTab = "weapons" | "armor" | "gear" | "packs";

/** Weapons by default; `tab=armor`, `tab=gear` and `tab=packs` show the others. */
export function equipmentTab(params: URLSearchParams): EquipmentTab {
  const tab = params.get("tab");
  return tab === "armor" || tab === "gear" || tab === "packs" ? tab : "weapons";
}

/** Item categories worth picking on the Gear tab. Weapons, armor and shields have their own tabs. */
export const GEAR_CATEGORIES = ["adventuring-gear", "ammunition", "tools", "trade-good", "poison", "land-vehicle", "waterborne-vehicle", "wand", "rod", "staff", "ring"];
export function weaponApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), kind: get("kind"), damageType: get("damageType"), document: get("document"), page: get("page"), pageSize: 40 };
}

export function armorApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), document: get("document"), page: get("page"), pageSize: 40 };
}

/**
 * Gear is everything that is not a weapon, armor or shield, which have their own tabs. Ticking the box
 * (`all=1`) lists those too, as items with a price and weight that link on to the weapon or armor.
 */
export function gearApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), category: get("category"), gear: params.get("all") === "1" ? undefined : "true", document: get("document"), page: get("page"), pageSize: 40 };
}

export function packApiParams(params: URLSearchParams) {
  const get = (k: string) => params.get(k) ?? undefined;
  return { q: get("q"), document: get("document"), page: get("page"), pageSize: 40 };
}

function Tabs({ tab }: { tab: EquipmentTab }) {
  return (
    <div className="tabs" role="tablist" aria-label="Equipment type">
      <Link href="/equipment" replace role="tab" aria-selected={tab === "weapons"} className={tab === "weapons" ? "active" : undefined}>
        Weapons
      </Link>
      <Link href="/equipment?tab=armor" replace role="tab" aria-selected={tab === "armor"} className={tab === "armor" ? "active" : undefined}>
        Armor
      </Link>
      <Link href="/equipment?tab=gear" replace role="tab" aria-selected={tab === "gear"} className={tab === "gear" ? "active" : undefined}>
        Gear
      </Link>
      <Link href="/equipment?tab=packs" replace role="tab" aria-selected={tab === "packs"} className={tab === "packs" ? "active" : undefined}>
        Packs &amp; sets
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

function GearList() {
  const { params, update } = useQueryParams();
  const api = gearApiParams(params);
  const state = useApi((s) => listItems(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  const all = params.get("all") === "1";
  return (
    <>
      <Filters>
        <SearchBox label="Search gear by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <Select
          label="Category"
          value={params.get("category") ?? ""}
          options={keyOptions(all ? [...GEAR_CATEGORIES, ...WEAPON_ARMOR_CATEGORIES] : GEAR_CATEGORIES)}
          onChange={(category) => update({ category })}
        />
        <Check label="Include weapons and armor" checked={all} onChange={(on) => update({ all: on ? "1" : undefined, category: undefined })} />
        <SourceFilter kind="items" value={params.get("document") ?? ""} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No gear matches those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((i) => (
                  <li key={i.id}>
                    <Link className="row" href={`/equipment/gear/${i.id}`}>
                      <span className="row-main">
                        <span className="row-name">{i.name}</span>
                        <span className="tag">{costLabel(i.costGp)}</span>
                      </span>
                      <span className="row-sub">
                        {titleKey(i.category)} · {weightLabel(i.weightLb)}
                        {docNames[i.documentKey] && i.documentKey !== SRD_KEY && ` · ${docNames[i.documentKey]}`}
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

function PacksList() {
  const { params, update } = useQueryParams();
  const api = packApiParams(params);
  const state = useApi((s) => listItemSets(api, s), JSON.stringify(api));
  const docNames = useDocNames();
  return (
    <>
      <Filters>
        <SearchBox label="Search packs and sets by name" value={params.get("q") ?? ""} onCommit={(q) => update({ q })} />
        <SourceFilter kind="item_sets" value={params.get("document") ?? ""} update={update} />
      </Filters>
      <Async state={state}>
        {(data) => (
          <Results data={data} empty="No packs or sets match those filters." onPage={(p) => update({ page: p === 1 ? undefined : String(p) })}>
            {(items) => (
              <ul className="rows">
                {items.map((s) => (
                  <li key={s.id}>
                    <Link className="row" href={`/equipment/packs/${s.id}`}>
                      <span className="row-main">
                        <span className="row-name">{s.name}</span>
                        <span className="tag">{s.itemCount === 1 ? "1 item" : `${s.itemCount} items`}</span>
                      </span>
                      {docNames[s.documentKey] && s.documentKey !== SRD_KEY && <span className="row-sub">{docNames[s.documentKey]}</span>}
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
      {tab === "weapons" && <WeaponsList />}
      {tab === "armor" && <ArmorList />}
      {tab === "gear" && <GearList />}
      {tab === "packs" && <PacksList />}
    </section>
  );
}
