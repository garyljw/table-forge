import type { MagicItem } from "@table-forge/shared";
import type { RawMagicItem } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

/** Open5e item categories that are magic item types. Shields are armour, ammunition is a weapon. */
const TYPES: Readonly<Record<string, MagicItem["type"]>> = {
  armor: "armor",
  shield: "armor",
  weapon: "weapon",
  ammunition: "weapon",
  potion: "potion",
  ring: "ring",
  rod: "rod",
  scroll: "scroll",
  staff: "staff",
  wand: "wand",
  "wondrous-item": "wondrous-item",
};

const RARITIES = new Set<string>(["common", "uncommon", "rare", "very-rare", "legendary", "artifact", "varies"]);

/** `requires attunement by a Paladin` becomes `by a Paladin`; a bare `requires attunement` becomes null. */
function attunementDetail(raw: RawMagicItem): string | null {
  if (raw.requires_attunement !== true) return null;
  const detail = cleanText(raw.attunement_detail)
    .replace(/^\((.*)\)$/s, "$1")
    .trim()
    .replace(/^requires\s+attunement\b[\s:,-]*/i, "")
    .trim();
  return detail === "" ? null : detail;
}

export function normaliseMagicItem(raw: RawMagicItem): MagicItem {
  const type = TYPES[cleanText(raw.category?.key).toLowerCase()];
  if (!type) throw new Error(`unknown magic item category "${raw.category?.key ?? ""}"`);
  const rarityKey = raw.rarity ? cleanText(raw.rarity.key).toLowerCase() : "varies";
  if (!RARITIES.has(rarityKey)) throw new Error(`unknown rarity "${rarityKey}"`);
  return {
    id: raw.key,
    dmOnly: false,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    type,
    rarity: rarityKey as MagicItem["rarity"],
    requiresAttunement: raw.requires_attunement === true,
    baseItem: cleanOrNull(raw.weapon?.name ?? raw.armor?.name)?.toLowerCase() ?? null,
    attunementDetail: attunementDetail(raw),
    description: cleanText(raw.desc),
    // Open5e does not mark these, and guessing from the text gets it wrong (an item can mention a curse
    // without being cursed), so they stay false until a source with real data (private or homebrew) sets them.
    sentient: false,
    cursed: false,
  };
}
