/**
 * Folds a name for searching: lowercased, accents and other combining marks removed
 * ("Hélène" and "helene" match). The import stores this in `name_search` and the API
 * folds the query the same way, so both sides must use this one function.
 */
export function foldName(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
