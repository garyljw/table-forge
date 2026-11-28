import { BookOwnersResponse, SetBookOwnerRequest } from "@table-forge/shared";
import { createMiddleware } from "hono/factory";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { isAdmin } from "../auth/permissions.js";

/**
 * `/api/admin/*`: the app owner's controls. Mounted under `/api`, behind the Access middleware.
 * Every route is admin-only (`ADMIN_EMAILS`); anyone else gets 403 whatever they send. Book ownership
 * written here is what lets a signed-in user read a private book (see `documentScopeFor`).
 */
export const adminRoutes = new Hono<AppEnv>();

/** The misconfiguration is logged once per isolate, not on every request. */
let warnedNoAdmins = false;

const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  // Fail closed, but say why: an empty secret makes every admin request a 403 and is easy to miss.
  if (!warnedNoAdmins && !(c.env.ADMIN_EMAILS ?? "").split(",").some((e) => e.trim() !== "")) {
    warnedNoAdmins = true;
    console.error("ADMIN_EMAILS is missing or empty: nobody is admin");
  }
  if (!isAdmin(c.get("identity"), c.env)) return c.json({ error: "Forbidden" }, 403);
  await next();
});
// Responses are per-caller and sensitive: never cached. Registered before the admin check so a 403 carries it too.
adminRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});

adminRoutes.use("*", requireAdmin);

adminRoutes.get("/book-owners", async (c) => {
  const [books, users, owners] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT key, display_name AS displayName FROM documents WHERE visibility = 'private' ORDER BY display_name COLLATE NOCASE, key"),
    // People who have signed in, plus anyone ticked who has not (so a tick is never invisible).
    c.env.DB.prepare("SELECT email FROM users UNION SELECT email FROM book_owners ORDER BY email"),
    c.env.DB.prepare("SELECT email, document_key AS documentKey FROM book_owners ORDER BY email, document_key"),
  ]);
  return c.json(BookOwnersResponse.parse({ books: books?.results, users: users?.results, owners: owners?.results }));
});

/**
 * Defence in depth for writes (the admin check has already run). A browser cross-site request is refused by
 * `Sec-Fetch-Site`, and a form post (which cannot set a JSON content type) by the content-type check.
 */
const guardWrite = createMiddleware<AppEnv>(async (c, next) => {
  const site = c.req.header("sec-fetch-site");
  if (site !== undefined && site !== "same-origin" && site !== "none") return c.json({ error: "Forbidden" }, 403);
  const type = (c.req.header("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") return c.json({ error: "Content-Type must be application/json" }, 415);
  await next();
});

adminRoutes.put("/book-owners", guardWrite, async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request", issues: ["body must be JSON"] }, 400);
  }
  const parsed = SetBookOwnerRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: "Invalid request", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
  const { email, documentKey, owns } = parsed.data;

  // Only a real private document can be ticked. A public or unknown key is rejected, not stored.
  const book = await c.env.DB.prepare("SELECT 1 AS ok FROM documents WHERE key = ? AND visibility = 'private'").bind(documentKey).first();
  if (!book) return c.json({ error: "Invalid request", issues: ["documentKey: not a private book"] }, 400);

  await (owns
    ? c.env.DB.prepare("INSERT OR IGNORE INTO book_owners (email, document_key, granted_at) VALUES (?, ?, ?)").bind(email, documentKey, new Date().toISOString())
    : c.env.DB.prepare("DELETE FROM book_owners WHERE email = ? AND document_key = ?").bind(email, documentKey)
  ).run();
  return c.json({ email, documentKey, owns });
});
