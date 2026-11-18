import type { SourceDocument } from "@table-forge/shared";
import { Link } from "wouter";

/** "Source: <document> — <licence>", shown on every detail page and linking to the credits entry. */
export function SourceLine({ document }: { document: SourceDocument }) {
  const licence = document.licenses.map((l) => l.name).join(" / ") || "licence not stated";
  return (
    <p className="source-line">
      Source:{" "}
      <Link href={`/credits#doc-${document.key}`}>{document.displayName}</Link> — {licence}
    </p>
  );
}
