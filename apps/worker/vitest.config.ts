import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  // The real migrations, applied to the test database in test/setup.ts.
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
  return {
    plugins: [
      cloudflareTest({
        // Test config has no static-assets binding, so tests don't need a web build.
        wrangler: { configPath: "./wrangler.test.jsonc" },
        // ADMIN_EMAILS stands in for the production secret. Set here (not in wrangler.test.jsonc) so a developer's
        // local .dev.vars cannot change what the tests see.
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, ADMIN_EMAILS: "admin@example.com" } },
      }),
    ],
    test: { include: ["test/**/*.test.ts"], setupFiles: ["./test/setup.ts"] },
  };
});
