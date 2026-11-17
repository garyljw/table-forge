import { HealthResponse } from "@table-forge/shared";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("returns a valid HealthResponse", async () => {
    const res = await exports.default.fetch(new Request("https://example.com/api/health"));
    expect(res.status).toBe(200);
    const parsed = HealthResponse.safeParse(await res.json());
    expect(parsed.success).toBe(true);
  });

  it("never sends the server-only canary to clients", async () => {
    const res = await exports.default.fetch(new Request("https://example.com/api/health"));
    const headers = JSON.stringify([...res.headers.entries()]);
    expect(headers).not.toContain("__TABLE_FORGE_SERVER_ONLY__");
    expect(await res.text()).not.toContain("__TABLE_FORGE_SERVER_ONLY__");
  });
});
