import type { Item, ItemSet } from "@table-forge/shared";
import type { RawItem, RawItemSet } from "./raw.js";
import { cleanOrNull, cleanText, documentKeyOf } from "./text.js";

function decimal(value: string | number | null | undefined, what: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`${what} "${value}" is not a number`);
  return n;
}

export function normaliseItem(raw: RawItem): Item {
  const documentKey = documentKeyOf(raw.document);
  if (documentKey === null) throw new Error(`item "${raw.key}" has no document`);
  const category = cleanText(raw.category?.key).toLowerCase();
  if (category === "") throw new Error("item has no category");
  const weight = decimal(raw.weight, "weight");
  // Open5e weighs everything in pounds. Anything else would need converting, so refuse it rather than show wrong numbers.
  if (weight !== null && raw.weight_unit && raw.weight_unit !== "lb") throw new Error(`unexpected weight unit "${raw.weight_unit}"`);
  return {
    id: raw.key,
    documentKey,
    dmOnly: false,
    name: cleanText(raw.name),
    category,
    costGp: decimal(raw.cost, "cost") ?? 0,
    weightLb: weight,
    description: cleanText(raw.desc),
    size: cleanOrNull(raw.size?.key)?.toLowerCase() ?? null,
    weaponId: cleanOrNull(raw.weapon?.key),
    armorId: cleanOrNull(raw.armor?.key),
  };
}

/**
 * `isKnownItem` says whether an item id is one we store. Open5e's sets also list items from the 2024 rules,
 * which we do not import, so those are left out rather than linking to nothing.
 */
export function normaliseItemSet(raw: RawItemSet, isKnownItem: (itemId: string) => boolean): ItemSet {
  const documentKey = documentKeyOf(raw.document);
  if (documentKey === null) throw new Error(`item set "${raw.key}" has no document`);
  const seen = new Set<string>();
  const items = (raw.items ?? [])
    .filter((i) => isKnownItem(i.key) && !seen.has(i.key) && seen.add(i.key))
    .map((i) => ({ id: i.key, name: cleanText(i.name ?? i.key) }));
  return {
    id: raw.key,
    documentKey,
    dmOnly: false,
    name: cleanText(raw.name),
    itemCount: items.length,
    description: cleanText(raw.desc),
    items,
  };
}
