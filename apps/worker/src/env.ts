import type { Hono } from "hono";
import type { Identity } from "./auth/access.js";

/** The Worker's bindings, declared once in global-props.d.ts (`Cloudflare.Env`). Keep in step with wrangler.jsonc. */
export type Bindings = Pick<Cloudflare.Env, "DB" | "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD" | "ACCESS_DEV_IDENTITY" | "ADMIN_EMAILS">;

export type AppEnv = { Bindings: Bindings; Variables: { identity: Identity } };
export type App = Hono<AppEnv>;
