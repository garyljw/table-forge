import type { Background } from "@table-forge/shared";
import type { RawBackground } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

export function normaliseBackground(raw: RawBackground): Background {
  return {
    id: raw.key,
    dmOnly: false,
    documentKey: raw.document.key,
    name: cleanText(raw.name),
    description: cleanText(raw.desc),
    benefits: (raw.benefits ?? []).map((b) => ({ name: cleanText(b.name), description: cleanText(b.desc), type: cleanOrNull(b.type) })),
  };
}
