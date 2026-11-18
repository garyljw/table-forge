import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders Open5e text. Raw HTML in the source is shown as plain text, never parsed (no rehype-raw),
 * and react-markdown's default URL handling drops `javascript:` links.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ? `md ${className}` : "md"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
