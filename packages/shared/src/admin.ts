import { z } from "zod";
import { DocumentKey } from "./rules/common.js";

/**
 * Emails are compared trimmed and lowercased everywhere. `normaliseEmail` is the one place that is done
 * for the shared contract; the worker uses it for every stored or compared address.
 */
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/** A plain address: one @, no spaces, a dot in the domain. Not a full RFC check; Access is the real gate. */
export const Email = z
  .string()
  .max(254)
  .transform(normaliseEmail)
  .pipe(z.string().regex(/^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/, "must be an email address"));

/** `PUT /api/admin/book-owners`: tick or untick one box. */
export const SetBookOwnerRequest = z.object({ email: Email, documentKey: DocumentKey, owns: z.boolean() }).strict();
export type SetBookOwnerRequest = z.infer<typeof SetBookOwnerRequest>;

/** `GET /api/admin/book-owners`. */
export const BookOwnersResponse = z.object({
  /** The private books (documents with private visibility). */
  books: z.array(z.object({ key: DocumentKey, displayName: z.string() })),
  /** Everyone who has signed in, plus anyone who has a tick but has not signed in yet. */
  users: z.array(z.object({ email: z.string() })),
  /** The ticks. */
  owners: z.array(z.object({ email: z.string(), documentKey: DocumentKey })),
});
export type BookOwnersResponse = z.infer<typeof BookOwnersResponse>;
