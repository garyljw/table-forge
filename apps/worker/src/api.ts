import { HealthResponse } from "@table-forge/shared";
import { Hono } from "hono";
import pkg from "../package.json" with { type: "json" };
import type { AppEnv } from "./env.js";
import { rulesRoutes } from "./rules/routes.js";

/**
 * Everything under `/api`. The Cloudflare Access middleware goes here, in front of the
 * routes: `api.use("*", requireAccess)`.
 */
export const api = new Hono<AppEnv>();

api.get("/health", (c) => {
  const body: HealthResponse = HealthResponse.parse({ ok: true, service: "table-forge", version: pkg.version });
  return c.json(body);
});

api.route("/rules", rulesRoutes);
