import { z } from "zod";
import { DocumentKey } from "./common.js";

/** Where a document's records came from. Route-level access checks later filter on this. */
export const DocumentOrigin = z.enum(["open5e", "private", "homebrew"]);
export type DocumentOrigin = z.infer<typeof DocumentOrigin>;

/** `public` documents may be served to anyone with a login; `private` ones need an explicit grant. */
export const DocumentVisibility = z.enum(["public", "private"]);
export type DocumentVisibility = z.infer<typeof DocumentVisibility>;

/**
 * A URL that is safe to render as a link: `http:` or `https:` only. Anything else (`javascript:`,
 * `data:`, junk) becomes null instead of failing the whole response, so one bad record cannot
 * take down a list. `z.string().url()` alone accepts `javascript:` URLs.
 */
// Note: this is a read/sanitise schema. It quietly drops bad values so display never breaks. A future
// write path (homebrew or private-data entry) must validate URLs strictly and reject them, not rely on this.
export const HttpUrl = z
  .string()
  .nullable()
  .transform((u) => (u !== null && /^https?:\/\/[^\s]+$/i.test(u) ? u : null));

export const DocumentLicense = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  /** Link to the licence text, when we know it. */
  url: HttpUrl,
});
export type DocumentLicense = z.infer<typeof DocumentLicense>;

/** A licence's full text, for the credits page (the OGL requires it to be shown). */
export const LicenseText = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  url: HttpUrl,
  text: z.string().min(1),
});
export type LicenseText = z.infer<typeof LicenseText>;

/**
 * One source document (a book, the SRD, a homebrew pack). Every record points at one
 * through `documentKey`, and the attribution here is shown wherever its content appears.
 */
export const SourceDocument = z.object({
  key: DocumentKey,
  name: z.string().min(1),
  displayName: z.string().min(1),
  publisher: z.string().min(1),
  author: z.string().nullable(),
  /** Game system key from Open5e, e.g. `5e-2014`. */
  gameSystem: z.string().min(1),
  licenses: z.array(DocumentLicense),
  /** Ready-to-show attribution line. */
  attribution: z.string().min(1),
  /**
   * Section 15 style copyright notice for OGL documents. Open5e does not supply one, so
   * this is derived from its document metadata (name, publisher, author, year) and null
   * for documents that are not under the OGL.
   */
  copyrightNotice: z.string().nullable(),
  /** The document's own page (Open5e's `permalink`). */
  url: HttpUrl,
  publicationDate: z.string().nullable(),
  origin: DocumentOrigin,
  visibility: DocumentVisibility,
});
export type SourceDocument = z.infer<typeof SourceDocument>;
