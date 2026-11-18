import type { ReactNode } from "react";
import { safeHttpUrl } from "../format.js";

/** A link to an outside page, rendered only when the URL is plain http or https. Otherwise it is just text. */
export function ExternalLink({ href, children }: { href: string | null | undefined; children: ReactNode }) {
  const safe = safeHttpUrl(href);
  if (safe === null) return <>{children}</>;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
