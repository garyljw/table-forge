import type { SourceDocument } from "@table-forge/shared";
import { Link } from "wouter";

/** "Source: <document> — <licence>", shown on every detail page and linking to the credits entry. */
export function SourceLine({ document }: { document: SourceDocument }) {
  // The owner's private books have no licence text; say what they are rather than "not stated".
  const licence = document.visibility === "private" ? "owner's private copy" : document.licenses.map((l) => l.name).join(" / ") || "licence not stated";
  return (
    <p className="source-line">
      Source:{" "}
      <Link href={`/credits#doc-${document.key}`}>{document.displayName}</Link> — {licence}
    </p>
  );
}
