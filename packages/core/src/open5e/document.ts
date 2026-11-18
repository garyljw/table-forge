import type { LicenseText, SourceDocument } from "@table-forge/shared";
import { ATTRIBUTION_OVERRIDES, LICENSE_URLS } from "./config.js";
import type { RawDocument, RawLicense } from "./raw.js";
import { cleanOrNull, cleanText } from "./text.js";

export function buildAttribution(raw: RawDocument): string {
  const override = ATTRIBUTION_OVERRIDES[raw.key];
  if (override) return override;
  const by = cleanOrNull(raw.author) ? ` by ${cleanOrNull(raw.author)}` : "";
  const licences = (raw.licenses ?? []).map((l) => l.name);
  const licence = licences.length > 0 ? ` Used under the ${licences.join(" and ")}.` : "";
  const source = cleanOrNull(raw.permalink) ? ` Source: ${cleanOrNull(raw.permalink)}.` : "";
  return `${raw.name}${by}, published by ${raw.publisher.name}.${licence}${source}`;
}

/** A Section 15 style line, derived from metadata because Open5e has no copyright field. */
function buildCopyrightNotice(raw: RawDocument): string | null {
  if (!(raw.licenses ?? []).some((l) => l.key === "ogl-10a")) return null;
  const year = cleanOrNull(raw.publication_date)?.slice(0, 4);
  const author = cleanOrNull(raw.author);
  return `${raw.name}${year ? ` Copyright ${year}` : ""}, ${raw.publisher.name}${author ? `; Authors ${author}` : ""}.`;
}

export function normaliseDocument(raw: RawDocument): SourceDocument {
  return {
    key: raw.key,
    name: raw.name,
    displayName: raw.display_name ?? raw.name,
    publisher: raw.publisher.name,
    author: cleanOrNull(raw.author),
    gameSystem: raw.gamesystem.key,
    licenses: (raw.licenses ?? []).map((l) => ({ key: l.key, name: l.name, url: LICENSE_URLS[l.key] ?? null })),
    attribution: buildAttribution(raw),
    copyrightNotice: buildCopyrightNotice(raw),
    url: cleanOrNull(raw.permalink),
    publicationDate: cleanOrNull(raw.publication_date),
    origin: "open5e",
    visibility: "public",
  };
}

export function normaliseLicense(raw: RawLicense): LicenseText {
  return { key: raw.key, name: raw.name, url: LICENSE_URLS[raw.key] ?? null, text: cleanText(raw.desc) };
}
