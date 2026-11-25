import { MeResponse } from "@table-forge/shared";
import { exports } from "cloudflare:workers";
import { createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { PUBLIC_API_PATHS } from "../src/api.js";
import { requireAccess } from "../src/auth/access.js";
import type { AppEnv } from "../src/env.js";
import app from "../src/index.js";
import { authedFetch, AUD, TEAM, DOWN_TEAM, NETWORK_FAIL_TEAM, hs256Token, ISS, otherPair, signToken, unsignedToken } from "./auth.js";

const ME = "https://example.com/api/me";
const SPELLS = "https://example.com/api/rules/spells?q=fire";

async function withHeader(url: string, token?: string): Promise<Response> {
  return exports.default.fetch(new Request(url, token ? { headers: { "Cf-Access-Jwt-Assertion": token } } : {}));
}

describe("Access JWT verification", () => {
  it("accepts a valid token and exposes the identity", async () => {
    const res = await authedFetch(ME);
    expect(res.status).toBe(200);
    expect(MeResponse.parse(await res.json())).toEqual({ email: "player@example.com" });
  });

  it("accepts an array audience that includes ours", async () => {
    const res = await authedFetch(ME, {}, await signToken({ aud: ["some-other-aud", AUD] }));
    expect(res.status).toBe(200);
  });

  it("rejects an array audience that does not include ours", async () => {
    expect((await withHeader(ME, await signToken({ aud: ["a", "b"] }))).status).toBe(401);
  });

  it.each([
    ["wrong aud", () => signToken({ aud: "other-aud" })],
    ["wrong iss", () => signToken({ iss: "https://evil.cloudflareaccess.com" })],
    ["expired", () => signToken({ exp: Math.floor(Date.now() / 1000) - 600 })],
    ["not yet valid", () => signToken({ nbf: Math.floor(Date.now() / 1000) + 600 })],
    ["bad signature", () => signToken({ key: otherPair.privateKey })],
    ["unknown kid", () => signToken({ kid: "nope" })],
    ["alg none", async () => unsignedToken()],
    ["HS256", () => hs256Token("a-shared-secret-that-is-long-enough-123")],
    ["no email", () => signToken({ email: null })],
    ["garbage", async () => "not.a.jwt"],
  ])("rejects %s with a generic 401", async (_name, make) => {
    const res = await withHeader(ME, await make());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorised" });
  });

  it("rejects a missing header, and ignores the CF_Authorization cookie", async () => {
    expect((await withHeader(ME)).status).toBe(401);
    const res = await exports.default.fetch(new Request(ME, { headers: { cookie: `CF_Authorization=${await signToken()}` } }));
    expect(res.status).toBe(401);
  });

  it("ISS constant matches the test config", () => {
    expect(ISS).toBe("https://test-team.cloudflareaccess.com");
  });
});

describe("routes", () => {
  it("keeps /api/health public", async () => {
    expect((await withHeader("https://example.com/api/health")).status).toBe(200);
  });

  it("requires auth for the rules routes", async () => {
    expect((await withHeader(SPELLS)).status).toBe(401);
    expect((await withHeader("https://example.com/api/rules/credits")).status).toBe(401);
    expect((await authedFetch(SPELLS)).status).toBe(200);
  });

  it("requires auth for every character option route, lists and details", async () => {
    for (const path of ["species", "backgrounds", "feats", "weapons", "armor", "magic-items", "roll-tables", "rule-sections"]) {
      expect((await withHeader(`https://example.com/api/rules/${path}`)).status).toBe(401);
      expect((await withHeader(`https://example.com/api/rules/${path}/srd_x`)).status).toBe(401);
      expect((await authedFetch(`https://example.com/api/rules/${path}`)).status).toBe(200);
    }
  });

  it("keeps the public list to health only, and protects a route added to the same app", async () => {
    expect(PUBLIC_API_PATHS).toEqual(["/api/health"]);
    // Hono freezes its router after the first request, so build a fresh app the way api.ts does.
    const fresh = new Hono<AppEnv>();
    fresh.use("*", requireAccess(PUBLIC_API_PATHS));
    fresh.get("/api/zz-added-later", (c) => c.json({ secret: true }));
    fresh.get("/api/health/extra", (c) => c.json({ secret: true }));
    const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD } as never;
    for (const path of ["/api/zz-added-later", "/api/health/extra", "/api/health/"]) {
      expect((await fresh.fetch(new Request(`https://example.com${path}`), env, createExecutionContext())).status).toBe(401);
    }
    const ok = await fresh.fetch(new Request("https://example.com/api/zz-added-later", { headers: { "Cf-Access-Jwt-Assertion": await signToken() } }), env, createExecutionContext());
    expect(ok.status).toBe(200);
  });

  it("requires auth for unknown /api paths too (no existence oracle)", async () => {
    expect((await withHeader("https://example.com/api/nope")).status).toBe(401);
  });
});

// The bypass and the missing-config case need different bindings, so call the app directly with a custom env.
describe("dev bypass and fail-closed config", () => {
  const baseEnv = { DB: undefined as never, ACCESS_TEAM_DOMAIN: "test-team.cloudflareaccess.com", ACCESS_AUD: AUD };
  const call = (url: string, env: Record<string, unknown>, headers: Record<string, string> = {}) =>
    app.fetch(new Request(url, { headers }), { ...baseEnv, ...env } as never, createExecutionContext());

  it("honours ACCESS_DEV_IDENTITY on localhost and 127.0.0.1", async () => {
    for (const host of ["http://localhost:8787", "http://127.0.0.1:8787"]) {
      const res = await call(`${host}/api/me`, { ACCESS_DEV_IDENTITY: "dev@example.com" });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ email: "dev@example.com" });
    }
  });

  it("refuses the bypass for any other host", async () => {
    for (const host of ["https://table-forge.garyljw.workers.dev", "https://localhost.evil.com", "http://10.0.0.5:8787"]) {
      expect((await call(`${host}/api/me`, { ACCESS_DEV_IDENTITY: "dev@example.com" })).status).toBe(401);
    }
  });

  it("refuses the bypass when the request came through Cloudflare's edge (cf-ray)", async () => {
    const res = await call("http://localhost:8787/api/me", { ACCESS_DEV_IDENTITY: "dev@example.com" }, { "cf-ray": "abc-LHR" });
    expect(res.status).toBe(401);
  });

  it("does nothing when ACCESS_DEV_IDENTITY is unset or blank", async () => {
    expect((await call("http://localhost:8787/api/me", {})).status).toBe(401);
    expect((await call("http://localhost:8787/api/me", { ACCESS_DEV_IDENTITY: "  " })).status).toBe(401);
  });

  it("returns 503, not 401, when the key set cannot be fetched", async () => {
    for (const team of [DOWN_TEAM, NETWORK_FAIL_TEAM]) {
      const token = await signToken({ team });
      const res = await call("https://example.com/api/me", { ACCESS_TEAM_DOMAIN: team }, { "Cf-Access-Jwt-Assertion": token });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "Authentication temporarily unavailable" });
    }
  });

  it("fails closed when Access config is missing or empty", async () => {
    const token = await signToken();
    for (const env of [{ ACCESS_AUD: "" }, { ACCESS_TEAM_DOMAIN: "" }, { ACCESS_AUD: undefined }, { ACCESS_TEAM_DOMAIN: undefined }]) {
      const res = await call("https://example.com/api/me", env, { "Cf-Access-Jwt-Assertion": token });
      expect(res.status).toBe(500);
    }
  });
});
