import type { DocumentScope } from "../rules/db.js";
import type { Identity } from "./access.js";

/**
 * Can this caller read the owner's private book data (transcribed PHB, DMG, MM)?
 *
 * TRUE only for a verified Access USER: an identity whose `kind` is "user", which the middleware
 * only creates from a validated JWT carrying an email (or the localhost-only dev bypass). Everything
 * else gets FALSE: a missing identity, a malformed one, an Access service token (it has no email,
 * so the middleware never makes a "user" of it), and any identity of a kind that does not exist yet.
 *
 * Why an allow-list on `kind` and not a deny-list: the Display role (the TV) will sign in without
 * a person, with a DM-issued or service token, and will get its own `kind`. It must see
 * player-visible state only, so it must NOT read private book data. Because this test says
 * `kind === "user"`, a new kind is denied until someone deliberately changes this function. Do not
 * add a "role" shortcut here; if a future role should read books, name it explicitly and add a test.
 *
 * Copyright rule (CLAUDE.md): non-SRD book content is served only to an authenticated, invited user.
 * Invitation is enforced by the Access policy in front of the whole site.
 */
export function canReadPrivateBooks(identity: Identity | null | undefined): boolean {
  if (!identity || typeof identity !== "object") return false;
  return identity.kind === "user" && typeof identity.email === "string" && identity.email.trim() !== "";
}

/** The document scope for a request. The only way routes obtain one, so it always passes through the decision above. */
export function documentScopeFor(identity: Identity | null | undefined): DocumentScope {
  return { includePrivate: canReadPrivateBooks(identity) };
}
