import { HealthResponse, MeResponse } from "@table-forge/shared";
import { Hono } from "hono";
import pkg from "../package.json" with { type: "json" };
import type { AppEnv } from "./env.js";
import { requireAccess } from "./auth/access.js";
import { canReadPrivateBooks, isAdmin, ownerEmail } from "./auth/permissions.js";
import { adminRoutes } from "./admin/routes.js";
import { rulesRoutes } from "./rules/routes.js";

/**
 * Paths that need no Access identity. Everything else under `/api` is protected, whatever order
 * routes are registered in. Health returns only a fixed name and version; Access still guards the
 * whole hostname at the edge.
 */
export const PUBLIC_API_PATHS: readonly string[] = ["/api/health"];

/** Everything under `/api`. */
export const api = new Hono<AppEnv>();

api.use("*", requireAccess(PUBLIC_API_PATHS));

api.get("/health", (c) => {
  const body: HealthResponse = HealthResponse.parse({ ok: true, service: "table-forge", version: pkg.version });
  return c.json(body);
});

/**
 * Who am I. The web app calls this once on load, so it is also where a person is recorded as "has signed in"
 * (the admin page lists them). `isAdmin` only decides whether the admin link shows; admin routes check again.
 */
api.get("/me", async (c) => {
  const identity = c.get("identity");
  // Only verified users are recorded, and only when the row is missing or its last_seen is over an hour old, so a
  // page load is usually a no-op. The write is off the response path (waitUntil), and a failure is logged, never fatal.
  const record = async () => {
    try {
      const now = Date.now();
      await c.env.DB.prepare(
        "INSERT INTO users (email, first_seen, last_seen) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET last_seen = excluded.last_seen WHERE users.last_seen < ?",
      )
        .bind(ownerEmail(identity), new Date(now).toISOString(), new Date(now).toISOString(), new Date(now - 60 * 60 * 1000).toISOString())
        .run();
    } catch (err) {
      console.error("could not record sign-in", err);
    }
  };
  if (canReadPrivateBooks(identity)) c.executionCtx.waitUntil(record());
  c.header("Cache-Control", "private, no-store");
  return c.json(MeResponse.parse({ email: identity.email, isAdmin: isAdmin(identity, c.env) }));
});

api.route("/admin", adminRoutes);

api.route("/rules", rulesRoutes);
