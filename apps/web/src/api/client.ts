/** Anything with a `parse` method, which every Zod schema has. Keeps this file free of a direct Zod import. */
export interface Parser<T> {
  parse(input: unknown): T;
}

export class ApiRequestError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Build `?a=1&b=2`, leaving out empty values. Returns "" when nothing is left. */
export function queryString(params: QueryParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s === "" ? "" : `?${s}`;
}

/**
 * GET a JSON endpoint and validate the body against a shared schema.
 * A response that does not match the schema is an error, never silently used.
 */
export async function apiGet<T>(
  path: string,
  schema: Parser<T>,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${path}${queryString(params)}`, { signal, headers: { accept: "application/json" } });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiRequestError("Could not reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    if (res.status === 404) throw new ApiRequestError("Not found.", 404);
    throw new ApiRequestError(`The server answered ${res.status}.`, res.status);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiRequestError("The server sent something that was not JSON.", res.status);
  }
  try {
    return schema.parse(body);
  } catch {
    throw new ApiRequestError("The server sent data in an unexpected shape.", res.status);
  }
}
