/** Open5e text uses CRLF in places and has stray edge whitespace. */
export function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n?/g, "\n").trim();
}

export function cleanOrNull(value: string | null | undefined): string | null {
  const text = cleanText(value);
  return text === "" ? null : text;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The document key of a record, whether Open5e sent the bare key or a document object. */
export function documentKeyOf(document: string | { key: string } | null | undefined): string | null {
  if (document === null || document === undefined) return null;
  return typeof document === "string" ? document : document.key;
}
