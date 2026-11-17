import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Test config has no static-assets binding, so tests don't need a web build.
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: { include: ["test/**/*.test.ts"] },
});
