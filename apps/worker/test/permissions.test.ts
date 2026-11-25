import { describe, expect, it } from "vitest";
import type { Identity } from "../src/auth/access.js";
import { canReadPrivateBooks, documentScopeFor } from "../src/auth/permissions.js";
import { DISPLAY, EMAIL_BUT_NOT_USER, SERVICE_TOKEN, USER } from "./identities.js";

describe("canReadPrivateBooks", () => {
  it("allows a verified Access user", () => {
    expect(canReadPrivateBooks(USER)).toBe(true);
    expect(documentScopeFor(USER)).toEqual({ includePrivate: true });
  });

  it.each([
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
  ])("denies %s", (_name, identity) => {
    expect(canReadPrivateBooks(identity)).toBe(false);
    expect(documentScopeFor(identity)).toEqual({ includePrivate: false });
  });
});
