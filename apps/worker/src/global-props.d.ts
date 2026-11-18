// Tells the Workers types what this Worker's main module exports,
// so `exports.default.fetch` is typed in tests, and which bindings `env` has.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("./index.js");
  }
  interface Env {
    DB: D1Database;
    /** vars in wrangler config. Not secrets. */
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    /** Local dev only, from .dev.vars. Never set in a wrangler config. */
    ACCESS_DEV_IDENTITY?: string;
  }
}
