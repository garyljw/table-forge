/**
 * Server-only marker. The CI step `pnpm check:canary` scans the built front end
 * (apps/web/dist) and fails if this string ever appears there.
 */
export const SERVER_ONLY_CANARY = "__TABLE_FORGE_SERVER_ONLY__";
