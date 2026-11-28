import { env } from "cloudflare:workers";
import { BookOwnersResponse, MeResponse } from "@table-forge/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authedFetch, signToken } from "./auth.js";
import { addOtherBook, seedRules } from "./seed.js";

const URL_ = "https://example.com/api/admin/book-owners";
const as = async (email: string | null, path = URL_, init: RequestInit = {}) => authedFetch(path, init, email === null ? undefined : await signToken({ email }));
const put = (email: string | null, body: unknown, raw = false) =>
  as(email, URL_, { method: "PUT", headers: { "content-type": "application/json" }, body: raw ? (body as string) : JSON.stringify(body) });
const get = async () => BookOwnersResponse.parse(await (await as("admin@example.com")).json());
const rows = async () => (await env.DB.prepare("SELECT email, document_key FROM book_owners ORDER BY email, document_key").all()).results;

beforeEach(async () => {
  await seedRules();
  await addOtherBook();
});

describe("admin access", () => {
  it("is 403 for a signed-in non-admin, on every method", async () => {
    expect((await as("player@example.com")).status).toBe(403);
    expect((await put("player@example.com", { email: "a@b.co", documentKey: "secret-book", owns: true })).status).toBe(403);
    expect(await rows()).toEqual([]);
  });

  it("is 401 without a token", async () => {
    expect((await authedFetch(URL_, {}, "not-a-token")).status).toBe(401);
  });

  it("is 403 for everyone when ADMIN_EMAILS is missing or empty", async () => {
    const { default: app } = await import("../src/index.js");
    const { createExecutionContext } = await import("cloudflare:test");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const ADMIN_EMAILS of [undefined, "", "  "]) {
      const token = await signToken({ email: "admin@example.com" });
      const res = await app.fetch(new Request(URL_, { headers: { "Cf-Access-Jwt-Assertion": token } }), { ...env, ADMIN_EMAILS } as never, createExecutionContext());
      expect(res.status).toBe(403);
    }
    // Logged once per isolate, not per request (the flag is module-level; no earlier test in this file runs without ADMIN_EMAILS).
    expect(log.mock.calls.length).toBe(1);
    expect(log.mock.calls[0]?.[0]).toMatch(/ADMIN_EMAILS/);
    log.mockRestore();
  });

  it("does not log when ADMIN_EMAILS is set", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await as("player@example.com");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("works for the admin, case-insensitively, and is never cached", async () => {
    const res = await as("Admin@Example.COM");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect((await as("player@example.com")).headers.get("cache-control")).toBe("private, no-store");
    expect((await put("admin@example.com", { nope: 1 })).headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not make the admin an owner of any book", async () => {
    const res = await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: "admin@example.com" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/book-owners", () => {
  it("lists private books only, known users, and ticks", async () => {
    await authedFetch("https://example.com/api/me", {}, await signToken({ email: "Seen@Example.com" }));
    await put("admin@example.com", { email: "ghost@example.com", documentKey: "secret-book", owns: true });
    const body = await get();
    expect(body.books).toEqual([
      { key: "other-book", displayName: "Other Book" },
      { key: "secret-book", displayName: "Secret Book" },
    ]);
    expect(body.users.map((u) => u.email)).toEqual(["ghost@example.com", "seen@example.com"]);
    expect(body.owners).toEqual([{ email: "ghost@example.com", documentKey: "secret-book" }]);
  });
});

describe("PUT /api/admin/book-owners", () => {
  const tick = { email: "gary@x.com", documentKey: "secret-book", owns: true };

  it("grants, is idempotent, and revokes", async () => {
    expect((await put("admin@example.com", tick)).status).toBe(200);
    expect((await put("admin@example.com", tick)).status).toBe(200);
    expect(await rows()).toEqual([{ email: "gary@x.com", document_key: "secret-book" }]);
    expect((await put("admin@example.com", { ...tick, owns: false })).status).toBe(200);
    expect((await put("admin@example.com", { ...tick, owns: false })).status).toBe(200);
    expect(await rows()).toEqual([]);
  });

  it("normalises the email, so the tick matches the Access identity in any case", async () => {
    const res = await put("admin@example.com", { ...tick, email: "  Gary@X.com " });
    expect(await res.json()).toEqual(tick);
    expect(await rows()).toEqual([{ email: "gary@x.com", document_key: "secret-book" }]);
    const read = await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: "GARY@x.COM" }));
    expect(read.status).toBe(200);
    // Revoking in another case removes the same row.
    await put("admin@example.com", { ...tick, email: "GARY@X.COM", owns: false });
    expect(await rows()).toEqual([]);
    expect((await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: "gary@x.com" }))).status).toBe(404);
  });

  it("keeps ticks per book and per person", async () => {
    await put("admin@example.com", tick);
    await put("admin@example.com", { ...tick, documentKey: "other-book" });
    await put("admin@example.com", { ...tick, email: "pal@x.com" });
    await put("admin@example.com", { ...tick, owns: false });
    expect(await rows()).toEqual([
      { email: "gary@x.com", document_key: "other-book" },
      { email: "pal@x.com", document_key: "secret-book" },
    ]);
  });

  it.each([
    ["a bad email", { ...tick, email: "not-an-email" }],
    ["an email with two addresses", { ...tick, email: "a@b.co,c@d.co" }],
    ["an empty email", { ...tick, email: "" }],
    ["an unknown book", { ...tick, documentKey: "no-such-book" }],
    ["a public book", { ...tick, documentKey: "srd-2014" }],
    ["a malformed key", { ...tick, documentKey: "x'; DROP TABLE book_owners;--" }],
    ["a missing owns", { email: tick.email, documentKey: tick.documentKey }],
    ["a non-boolean owns", { ...tick, owns: "yes" }],
    ["an extra field", { ...tick, admin: true }],
    ["an array", [tick]],
    ["null", null],
  ])("rejects %s with 400 and stores nothing", async (_label, body) => {
    expect((await put("admin@example.com", body)).status).toBe(400);
    expect(await rows()).toEqual([]);
  });

  it("returns 415 unless the content type is application/json (charset allowed)", async () => {
    const send = async (type: string | null) =>
      as("admin@example.com", URL_, { method: "PUT", headers: type === null ? {} : { "content-type": type }, body: JSON.stringify(tick) });
    for (const t of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", null]) expect((await send(t)).status).toBe(415);
    expect((await send("application/json; charset=utf-8")).status).toBe(200);
    expect((await send("Application/JSON")).status).toBe(200);
    expect(await rows()).toEqual([{ email: "gary@x.com", document_key: "secret-book" }]);
  });

  it("returns 403 for a cross-site request, and allows same-origin and none", async () => {
    const send = (site: string) =>
      as("admin@example.com", URL_, { method: "PUT", headers: { "content-type": "application/json", "sec-fetch-site": site }, body: JSON.stringify(tick) });
    for (const site of ["cross-site", "same-site", "bogus"]) expect((await send(site)).status).toBe(403);
    expect(await rows()).toEqual([]);
    expect((await send("same-origin")).status).toBe(200);
    expect((await send("none")).status).toBe(200);
  });

  it("still gives a non-admin 403 first, whatever the headers", async () => {
    const res = await as("player@example.com", URL_, { method: "PUT", headers: { "content-type": "text/plain", "sec-fetch-site": "same-origin" }, body: "x" });
    expect(res.status).toBe(403);
  });

  it("rejects a body that is not JSON", async () => {
    expect((await put("admin@example.com", "{nope", true)).status).toBe(400);
    expect((await put("admin@example.com", "", true)).status).toBe(400);
  });

  it("is not a way to tick on someone's behalf unless you are admin", async () => {
    expect((await put("player@example.com", tick)).status).toBe(403);
    expect(await rows()).toEqual([]);
  });
});

/** The sign-in write runs in waitUntil, after the response. */
const seen = (email: string) =>
  vi.waitFor(async () => expect(await env.DB.prepare("SELECT 1 AS ok FROM users WHERE email = ?").bind(email).first()).not.toBeNull());

describe("GET /api/me", () => {
  it("reports isAdmin and records the person once, updating last_seen", async () => {
    const admin = MeResponse.parse(await (await as("Admin@Example.com", "https://example.com/api/me")).json());
    expect(admin).toEqual({ email: "Admin@Example.com", isAdmin: true });
    const user = MeResponse.parse(await (await as("player@example.com", "https://example.com/api/me")).json());
    expect(user.isAdmin).toBe(false);
    await seen("admin@example.com");
    await seen("player@example.com");

    const OLD = "2000-01-01T00:00:00.000Z";
    await env.DB.prepare("UPDATE users SET first_seen = ?, last_seen = ? WHERE email = 'player@example.com'").bind(OLD, OLD).run();
    await as("Player@Example.com", "https://example.com/api/me");
    // The write runs in waitUntil, after the response, so wait for it.
    await vi.waitFor(async () => expect((await env.DB.prepare("SELECT last_seen FROM users WHERE email = 'player@example.com'").first<{ last_seen: string }>())?.last_seen).not.toBe(OLD));
    const all = (await env.DB.prepare("SELECT email, first_seen, last_seen FROM users ORDER BY email").all()).results as { email: string; first_seen: string; last_seen: string }[];
    expect(all.map((r) => r.email)).toEqual(["admin@example.com", "player@example.com"]);
    const player = all.find((r) => r.email === "player@example.com")!;
    expect(player.first_seen).toBe(OLD);
    expect(player.last_seen).not.toBe(OLD);
  });

  it("does not write again when last_seen is under an hour old", async () => {
    await as("player@example.com", "https://example.com/api/me");
    await seen("player@example.com");
    const recent = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await env.DB.prepare("UPDATE users SET last_seen = ? WHERE email = 'player@example.com'").bind(recent).run();
    await as("player@example.com", "https://example.com/api/me");
    await new Promise((r) => setTimeout(r, 100));
    expect((await env.DB.prepare("SELECT last_seen FROM users WHERE email = 'player@example.com'").first<{ last_seen: string }>())?.last_seen).toBe(recent);
  });

  it("still answers 200, and logs, when the users write fails", async () => {
    const { default: app } = await import("../src/index.js");
    const { createExecutionContext } = await import("cloudflare:test");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenDb = { prepare: () => { throw new Error("db down"); } };
    const token = await signToken({ email: "player@example.com" });
    const res = await app.fetch(new Request("https://example.com/api/me", { headers: { "Cf-Access-Jwt-Assertion": token } }), { ...env, DB: brokenDb } as never, createExecutionContext());
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
    log.mockRestore();
  });

  it("does not record anyone for other requests", async () => {
    await as("player@example.com", "https://example.com/api/rules/spells");
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>())?.n).toBe(0);
  });
});
