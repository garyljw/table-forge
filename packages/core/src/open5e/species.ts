import type { Species } from "@table-forge/shared";
import type { RawSpecies } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

/** `srd_half-elf` becomes "Half elf": the parent's name when its record is not available. */
function nameFromKey(key: string): string {
  const slug = key.slice(key.indexOf("_") + 1).replace(/[-_]+/g, " ").trim();
  return slug === "" ? "Unknown species" : slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function normaliseSpecies(raw: RawSpecies): Species {
  const parentKey = cleanOrNull(raw.subspecies_of);
  const isSub = raw.is_subspecies === true || parentKey !== null;
  return {
    id: raw.key,
    dmOnly: false,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    // The name is provisional; resolveSpeciesParents replaces it with the stored parent's real name.
    parentSpecies: isSub ? { id: parentKey, name: parentKey ? nameFromKey(parentKey) : "Unknown species" } : null,
    description: cleanText(raw.desc),
    traits: (raw.traits ?? []).map((t) => ({ name: cleanText(t.name), description: cleanText(t.desc), type: cleanOrNull(t.type) })),
  };
}

export type OrphanReason = "parent failed to normalise" | "parent not found" | "parent is itself a subspecies";

export interface SpeciesParentResolution {
  species: Species[];
  /** Subspecies whose parent could not be used; the id becomes null and the name is shown as text. */
  unresolved: { species: Species; reason: OrphanReason }[];
}

/**
 * A subspecies's parent id must be the id of a base species we store (the parent could belong to a document we do
 * not include, or have failed validation). Where it is, take the parent's real name; where it is not, keep the
 * subspecies but drop the id, and say why. `failedIds` are ids of records that did not normalise.
 */
export function resolveSpeciesParents(all: readonly Species[], failedIds: ReadonlySet<string> = new Set()): SpeciesParentResolution {
  const byId = new Map(all.map((s) => [s.id, s]));
  const unresolved: SpeciesParentResolution["unresolved"] = [];
  const species = all.map((s) => {
    const parent = s.parentSpecies;
    if (parent === null || parent.id === null) return s;
    const found = byId.get(parent.id);
    if (found && found.parentSpecies === null) return { ...s, parentSpecies: { id: found.id, name: found.name } };
    const reason: OrphanReason = found ? "parent is itself a subspecies" : failedIds.has(parent.id) ? "parent failed to normalise" : "parent not found";
    const orphan = { ...s, parentSpecies: { id: null, name: parent.name } };
    unresolved.push({ species: orphan, reason });
    return orphan;
  });
  return { species, unresolved };
}
