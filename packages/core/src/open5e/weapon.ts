import type { Weapon } from "@table-forge/shared";
import type { RawWeapon } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

/**
 * Open5e has no melee/ranged field. A weapon is ranged when it uses ammunition, or has a range and is not
 * thrown. Dart and net are thrown-only ranged weapons, which the data cannot tell apart from a dagger or
 * javelin (melee with a thrown option), so they are named here. Keyed by the slug after the document prefix.
 */
const THROWN_ONLY_RANGED = new Set(["dart", "net"]);

export function normaliseWeapon(raw: RawWeapon): Weapon {
  const properties = (raw.properties ?? []).map((p) => ({
    name: cleanText(p.property.name),
    detail: cleanOrNull(p.detail),
    description: cleanText(p.property.desc),
  }));
  const has = (name: string) => properties.some((p) => p.name.toLowerCase() === name);
  const normal = raw.range ?? 0;
  const long = raw.long_range ?? 0;
  const slug = raw.key.slice(raw.key.indexOf("_") + 1);
  const ranged = has("ammunition") || (normal > 0 && !has("thrown")) || THROWN_ONLY_RANGED.has(slug);
  const damageType = cleanOrNull(raw.damage_type?.key);
  if (raw.distance_unit && raw.distance_unit !== "feet") throw new Error(`unexpected distance unit "${raw.distance_unit}"`);
  return {
    id: raw.key,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    category: raw.is_simple ? "simple" : "martial",
    kind: ranged ? "ranged" : "melee",
    damageDice: cleanText(raw.damage_dice),
    damageType,
    improvised: raw.is_improvised === true,
    range: normal > 0 || long > 0 ? { normalFeet: normal, longFeet: long } : null,
    properties,
  };
}
