import { Link } from "wouter";
import { useDocNames } from "../hooks/useDocNames.js";

/** "Sources: ..." for a list page, linking each document to its credits entry. Nothing until the names have loaded. */
export function SourceNote({ documentKeys }: { documentKeys: string[] }) {
  const names = useDocNames();
  const keys = [...new Set(documentKeys)].filter((k) => names[k] !== undefined);
  if (keys.length === 0) return null;
  return (
    <p className="source-line">
      Source:{" "}
      {keys.map((k, i) => (
        <span key={k}>
          {i > 0 && ", "}
          <Link href={`/credits#doc-${k}`}>{names[k]}</Link>
        </span>
      ))}
      . See the <Link href="/credits">credits</Link> for licences.
    </p>
  );
}
