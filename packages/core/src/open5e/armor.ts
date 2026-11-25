import type { Armor } from "@table-forge/shared";
import type { RawArmor } from "./raw.js";
import { cleanText } from "./text.js";

const CATEGORIES: Readonly<Record<string, Armor["category"]>> = {
  light: "light",
  "light armor": "light",
  "light armour": "light",
  medium: "medium",
  "medium armor": "medium",
  "medium armour": "medium",
  heavy: "heavy",
  "heavy armor": "heavy",
  "heavy armour": "heavy",
  shield: "shield",
  shields: "shield",
};

export function armorCategory(value: string | null | undefined): Armor["category"] {
  const category = CATEGORIES[cleanText(value).toLowerCase()];
  if (!category) throw new Error(`unknown armor category "${value ?? ""}"`);
  return category;
}

export function normaliseArmor(raw: RawArmor): Armor {
  const acDisplay = cleanText(raw.ac_display);
  return {
    id: raw.key,
    dmOnly: false,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    category: armorCategory(raw.category),
    acBase: raw.ac_base,
    addsDexModifier: raw.ac_add_dexmod === true,
    dexModifierCap: raw.ac_cap_dexmod ?? null,
    strengthRequired: raw.strength_score_required ?? null,
    stealthDisadvantage: raw.grants_stealth_disadvantage === true,
    acDisplay: acDisplay === "" ? String(raw.ac_base) : acDisplay,
  };
}
