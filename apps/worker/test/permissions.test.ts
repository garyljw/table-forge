import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { Identity } from "../src/auth/access.js";
import { canReadPrivateBooks, documentScopeFor, isAdmin } from "../src/auth/permissions.js";
import { visibilityClause } from "../src/rules/db.js";
import { ADMIN, DISPLAY, EMAIL_BUT_NOT_USER, OTHER_USER, SERVICE_TOKEN, USER } from "./identities.js";
import { addOtherBook, own, seedRules } from "./seed.js";

const MALFORMED: [string, Identity | null | undefined][] = [
  ["undefined", undefined],
  ["null", null],
  ["a service token (no email)", SERVICE_TOKEN],
  ["a future Display identity", DISPLAY],
  ["an email on a non-user kind", EMAIL_BUT_NOT_USER],
  ["an empty email", { kind: "user", email: "", sub: "x" } as Identity],
  ["a blank email", { kind: "user", email: "   ", sub: "x" } as Identity],
  ["a user without an email", { kind: "user", sub: "x" } as unknown as Identity],
  ["a non-string email", { kind: "user", email: 7, sub: "x" } as unknown as Identity],
  ["an identity without a kind", { email: "a@b.c", sub: "x" } as unknown as Identity],
  ["a string", "a@b.c" as unknown as Identity],
];

beforeEach(async () => {
  await seedRules();
});

describe("canReadPrivateBooks", () => {
  it("allows a verified Access user", () => {
    expect(canReadPrivateBooks(USER)).toBe(true);
  });

  it.each(MALFORMED)("denies %s", (_name, identity) => {
    expect(canReadPrivateBooks(identity)).toBe(false);
  });
});

/** The private documents a scope can read, by running the real visibility clause. */
async function readableBooks(identity: Identity | null | undefined): Promise<string[]> {
  const vis = visibilityClause(documentScopeFor(identity));
  const { results } = await env.DB.prepare(`SELECT d.key AS key FROM documents d WHERE ${vis.sql} AND d.visibility = 'private' ORDER BY d.key`).bind(...vis.params).all<{ key: string }>();
  return results.map((r) => r.key);
}

describe("documentScopeFor and visibilityClause", () => {
  it("gives a user with no ticks public documents only", async () => {
    expect(documentScopeFor(USER)).toEqual({ email: "player@example.com" });
    expect(await readableBooks(USER)).toEqual([]);
  });

  it("gives one owned book", async () => {
    await own(USER.email, "secret-book");
    expect(await readableBooks(USER)).toEqual(["secret-book"]);
  });

  it("gives many owned books, and only that user's", async () => {
    await addOtherBook();
    await own(USER.email, "secret-book", "other-book");
    await own(OTHER_USER.email, "other-book");
    expect(await readableBooks(USER)).toEqual(["other-book", "secret-book"]);
    expect(await readableBooks(OTHER_USER)).toEqual(["other-book"]);
  });

  it("matches the email case-insensitively and ignoring spaces", async () => {
    await own("Player@Example.com  ", "secret-book");
    expect(await readableBooks(USER)).toEqual(["secret-book"]);
    expect(documentScopeFor({ ...USER, email: "  PLAYER@EXAMPLE.COM " })).toEqual({ email: "player@example.com" });
    expect(await readableBooks({ ...USER, email: "  PLAYER@EXAMPLE.COM " })).toEqual(["secret-book"]);
  });

  it("a tick for a public or missing document grants nothing extra", async () => {
    await own(USER.email, "srd-2014", "no-such-book");
    expect(await readableBooks(USER)).toEqual([]);
  });

  it("the clause for no email is exactly public-only, with no parameters", () => {
    expect(visibilityClause({ email: null })).toEqual({ sql: "d.visibility = 'public'", params: [] });
    expect(visibilityClause({ email: "a@b.co" }).params).toEqual(["a@b.co"]);
  });

  it.each(MALFORMED)("gives %s nothing, even when their email has a tick", async (_name, identity) => {
    await own(USER.email, "secret-book");
    await own("a@b.c", "secret-book");
    await own("tv@example.com", "secret-book");
    expect(documentScopeFor(identity)).toEqual({ email: null });
    expect(await readableBooks(identity)).toEqual([]);
  });
});

describe("isAdmin", () => {
  const e = (ADMIN_EMAILS?: string) => ({ ADMIN_EMAILS });

  it("is true for a listed user", () => {
    expect(isAdmin(ADMIN, e("admin@example.com"))).toBe(true);
  });

  it("is false when the secret is missing, empty or blank (fails closed)", () => {
    for (const v of [undefined, "", "   ", ",", " , ,"]) expect(isAdmin(ADMIN, e(v))).toBe(false);
    expect(isAdmin(ADMIN, {})).toBe(false);
    expect(isAdmin(ADMIN, { ADMIN_EMAILS: 5 as unknown as string })).toBe(false);
  });

  it("handles several entries, case and whitespace", () => {
    const list = " first@x.com , ADMIN@Example.COM,third@x.com ";
    expect(isAdmin(ADMIN, e(list))).toBe(true);
    expect(isAdmin({ ...ADMIN, email: "  Third@X.com" }, e(list))).toBe(true);
    expect(isAdmin(OTHER_USER, e(list))).toBe(false);
  });

  it("does not match by substring or domain", () => {
    expect(isAdmin(ADMIN, e("superadmin@example.com"))).toBe(false);
    expect(isAdmin(ADMIN, e("admin@example.com.evil.net"))).toBe(false);
    expect(isAdmin(ADMIN, e("@example.com"))).toBe(false);
  });

  it.each(MALFORMED)("is false for %s even if their email is listed", (_name, identity) => {
    expect(isAdmin(identity, e("admin@example.com,a@b.c,tv@example.com,player@example.com"))).toBe(false);
  });

  it("is not granted by owning a book, nor does it grant one", async () => {
    await own(OTHER_USER.email, "secret-book");
    expect(isAdmin(OTHER_USER, e("admin@example.com"))).toBe(false);
    expect(await readableBooks(ADMIN)).toEqual([]);
  });
});
