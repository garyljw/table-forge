import type { Hono } from "hono";

/** The Worker's bindings, declared once in global-props.d.ts (`Cloudflare.Env`). Keep in step with wrangler.jsonc. */
export type Bindings = Pick<Cloudflare.Env, "DB">;

export type AppEnv = { Bindings: Bindings };
export type App = Hono<AppEnv>;
