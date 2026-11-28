import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders Open5e text. Raw HTML in the source is shown as plain text, never parsed (no rehype-raw),
 * and react-markdown's default URL handling drops `javascript:` links.
 */
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** The shallowest heading level in the text (`###` is 3), or null when there are no headings. */
export function shallowestHeading(text: string): number | null {
  let min: number | null = null;
  for (const m of text.matchAll(/^(#{1,6})[ \t]/gm)) {
    const level = m[1]?.length ?? 6;
    if (min === null || level < min) min = level;
  }
  return min;
}

type HeadingComponents = Record<string, (props: { children?: React.ReactNode }) => React.ReactElement>;
const headingCache = new Map<number, HeadingComponents>();

/** Heading components for a shift, built once per shift so React keeps the same component types between renders (no remounts). */
function headingsFor(shift: number): HeadingComponents {
  let found = headingCache.get(shift);
  if (found === undefined) {
    found = Object.fromEntries(
      HEADING_LEVELS.map((level) => {
        const Tag = `h${Math.min(6, Math.max(1, level + shift))}` as "h1";
        return [`h${level}`, ({ children: c }: { children?: React.ReactNode }) => <Tag>{c}</Tag>];
      }),
    );
    headingCache.set(shift, found);
  }
  return found;
}

/**
 * `headingStart` moves the text's headings so its shallowest one lands on that level (the rest keep their
 * spacing, and nothing goes past `h6`). Rules text uses it to nest under the rule's own title.
 */
export function Markdown({ children, className, headingStart }: { children: string; className?: string; headingStart?: number }) {
  const min = headingStart === undefined ? null : shallowestHeading(children);
  const shift = headingStart === undefined || min === null ? 0 : headingStart - min;
  const headings = shift === 0 ? {} : headingsFor(shift);
  return (
    <div className={className ? `md ${className}` : "md"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ...headings,
          table: ({ children: c }) => (
            <div className="table-scroll" tabIndex={0}>
              <table>{c}</table>
            </div>
          ),
          // Third-party text may not pull in images (tracking, or content we were not given). Show the alt text instead.
          img: ({ alt }) => (alt ? <span>{alt}</span> : null),
          // Only absolute http(s) links are real links. Relative and hash links point at Open5e paths that do not exist here.
          a: ({ href, children: c }) =>
            href !== undefined && /^https?:\/\//i.test(href) ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {c}
              </a>
            ) : (
              <span>{c}</span>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
