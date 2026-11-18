import { HealthResponse, MeResponse } from "@table-forge/shared";
import { Hono } from "hono";
import pkg from "../package.json" with { type: "json" };
import type { AppEnv } from "./env.js";
import { requireAccess } from "./auth/access.js";
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

api.get("/me", (c) => c.json(MeResponse.parse({ email: c.get("identity").email })));

api.route("/rules", rulesRoutes);
