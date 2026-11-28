import { normaliseEmail } from "@table-forge/shared";
import type { DocumentScope } from "../rules/db.js";
import type { Identity } from "./access.js";

/**
 * Can this caller be given the owner's private book data at all (transcribed PHB, DMG, MM)?
 * This is only the first gate: which books they may read is decided by `book_owners` (see `documentScopeFor`).
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

/** The email a user's book ticks are stored under: trimmed and lowercased. */
export function ownerEmail(identity: Identity): string {
  return normaliseEmail(identity.email);
}

/**
 * The document scope for a request. The only way routes obtain one. A caller who fails `canReadPrivateBooks`
 * gets `email: null`, which means public documents only. A verified user gets their normalised email, and
 * `visibilityClause` lets them read exactly the private books `book_owners` ticks for that email.
 * No database access here: the rule is evaluated in each query.
 */
export function documentScopeFor(identity: Identity | null | undefined): DocumentScope {
  if (!identity || !canReadPrivateBooks(identity)) return { email: null };
  return { email: ownerEmail(identity) };
}

/**
 * Is this caller the app owner (admin)? Admins are listed in the `ADMIN_EMAILS` secret: comma-separated
 * emails, compared trimmed and case-insensitively. Missing or empty means nobody is admin. Like
 * `canReadPrivateBooks` it allow-lists `kind === "user"`, so a service token or a future Display kind is
 * never an admin. Being admin does not grant any book: ownership comes only from ticks.
 */
export function isAdmin(identity: Identity | null | undefined, env: { ADMIN_EMAILS?: string }): boolean {
  if (!canReadPrivateBooks(identity)) return false;
  const list = env.ADMIN_EMAILS;
  if (typeof list !== "string") return false;
  const me = ownerEmail(identity as Identity);
  return list
    .split(",")
    .map(normaliseEmail)
    .some((e) => e !== "" && e === me);
}
