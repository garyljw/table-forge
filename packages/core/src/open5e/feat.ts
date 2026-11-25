import type { Feat } from "@table-forge/shared";
import type { RawFeat } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

export function normaliseFeat(raw: RawFeat): Feat {
  return {
    id: raw.key,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    prerequisite: cleanOrNull(raw.prerequisite),
    category: cleanOrNull(raw.type),
    description: cleanText(raw.desc),
    benefits: (raw.benefits ?? []).map((b) => cleanText(b.desc)).filter((d) => d !== ""),
  };
}
