import type { Condition } from "@table-forge/shared";
import type { RawCondition } from "./raw.js";
import { cleanText } from "./text.js";

/**
 * Open5e keeps one condition record with a description per source document. We make
 * one condition per description from an included document, owned by that document,
 * so each carries the right attribution. The id is `<documentKey>_<conditionKey>`.
 */
export function normaliseConditions(raw: RawCondition, isIncludedDocument: (documentKey: string) => boolean): Condition[] {
  return raw.descriptions
    .filter((d) => isIncludedDocument(d.document))
    .map((d) => ({
      id: `${d.document}_${raw.key}`,
      documentKey: d.document,
      name: cleanText(raw.name),
      description: cleanText(d.desc),
    }));
}
