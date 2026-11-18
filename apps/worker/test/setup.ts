import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Applies the real migrations from apps/worker/migrations before each test file.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
