import { Hono } from "hono";
import { api } from "./api.js";
import { SERVER_ONLY_CANARY } from "./canary.js";
import type { AppEnv } from "./env.js";

// The canary is held in a non-enumerable global so the bundler cannot tree-shake
// it away. It is never read into a response. (Worker entry exports must be
// handlers or classes, so it cannot simply be re-exported.)
Object.defineProperty(globalThis, "__TABLE_FORGE_CANARY__", { value: SERVER_ONLY_CANARY, enumerable: false });

const app = new Hono<AppEnv>();

app.route("/api", api);

// Never leak internals: log the real error, send a generic body.
app.onError((err, c) => {
  console.error("unhandled error", err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
