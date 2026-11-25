import { env } from "cloudflare:workers";
import { Hono } from "hono";
import type { Identity } from "../src/auth/access.js";
import type { AppEnv } from "../src/env.js";
import { rulesRoutes } from "../src/rules/routes.js";

/**
 * Mounts the real rules routes behind a stub that sets the identity directly, so tests can try
 * callers the Access middleware would never let through today (a service token, a future Display
 * token). `undefined` means no identity is set at all.
 */
export type TestCaller = Identity | undefined;

export const USER: Identity = { kind: "user", email: "player@example.com", sub: "user-1" };
export const NO_IDENTITY: TestCaller = undefined;
/** A service token: no email, and not a "user". */
export const SERVICE_TOKEN = { kind: "service", sub: "svc-1" } as unknown as Identity;
/** A stand-in for the future Display role. */
export const DISPLAY = { kind: "display", sub: "tv-1" } as unknown as Identity;
/** A caller carrying an email but not of kind "user": still denied. */
export const EMAIL_BUT_NOT_USER = { kind: "display", email: "tv@example.com", sub: "tv-2" } as unknown as Identity;
/** The default non-private caller. */
export const NO_PRIVATE_ACCESS: TestCaller = SERVICE_TOKEN;

export function getAs(caller: TestCaller, path: string): Promise<Response> {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (caller) c.set("identity", caller);
    await next();
  });
  app.route("/api/rules", rulesRoutes);
  return Promise.resolve(app.request(`https://example.com/api/rules${path}`, {}, env));
}
