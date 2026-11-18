import { getDocuments } from "../api/rules.js";
import { useApi } from "./useApi.js";

/** Document key to display name, for source badges in lists. Empty until loaded (or if it fails). */
export function useDocNames(): Record<string, string> {
  const docs = useApi(() => getDocuments(), "documents");
  if (docs.status !== "ok") return {};
  return Object.fromEntries(docs.data.items.map((d) => [d.key, d.displayName]));
}
