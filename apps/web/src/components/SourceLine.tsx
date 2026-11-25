import type { SourceDocument } from "@table-forge/shared";
import { Link } from "wouter";

/** "Source: <document> — <licence>", shown on every detail page and linking to the credits entry. */
export function SourceLine({ document }: { document: SourceDocument }) {
  // Show the licence names when there are any. A private book with none is the owner's own copy.
  const names = document.licenses.map((l) => l.name).join(" / ");
  const licence = names !== "" ? names : document.visibility === "private" ? "owner's private copy" : "licence not stated";
  return (
    <p className="source-line">
      Source:{" "}
      <Link href={`/credits#doc-${document.key}`}>{document.displayName}</Link> — {licence}
    </p>
  );
}
