import { HealthResponse } from "@table-forge/shared";
import { Hono } from "hono";
import pkg from "../package.json" with { type: "json" };

import { SERVER_ONLY_CANARY } from "./canary.js";

// The canary is held in a non-enumerable global so the bundler cannot tree-shake
// it away. It is never read into a response. (Worker entry exports must be
// handlers or classes, so it cannot simply be re-exported.)
Object.defineProperty(globalThis, "__TABLE_FORGE_CANARY__", { value: SERVER_ONLY_CANARY, enumerable: false });

const app = new Hono();

app.get("/api/health", (c) => {
  const body: HealthResponse = HealthResponse.parse({ ok: true, service: "table-forge", version: pkg.version });
  return c.json(body);
});

export default app;
