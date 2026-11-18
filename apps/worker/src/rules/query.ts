import type { ApiError } from "@table-forge/shared";
import type { Context } from "hono";
import type { AppEnv } from "../env.js";

/** What `parseQuery` needs from a Zod schema (the worker does not import zod itself). */
interface QuerySchema<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

/** A parsed query string, or the 400 response to send instead. */
export function parseQuery<T>(c: Context<AppEnv>, schema: QuerySchema<T>): { ok: true; query: T } | { ok: false; response: Response } {
  const result = schema.safeParse(c.req.query());
  if (result.success) return { ok: true, query: result.data };
  const body: ApiError = {
    error: "Invalid query parameters",
    issues: result.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
  };
  return { ok: false, response: c.json(body, 400) };
}

export function notFound(c: Context<AppEnv>, what: string): Response {
  const body: ApiError = { error: `${what} not found` };
  return c.json(body, 404);
}
