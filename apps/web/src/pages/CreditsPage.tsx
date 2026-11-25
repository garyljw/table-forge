import type { DocumentListResponse } from "@table-forge/shared";
import { useEffect } from "react";
import { getDocuments, getLicenses } from "../api/rules.js";
import { ExternalLink } from "../components/ExternalLink.js";
import { Async } from "../components/States.js";
import { useApi } from "../hooks/useApi.js";

type Doc = DocumentListResponse["items"][number];

function counts(c: Doc["counts"]): string {
  const parts = (
    [
      ["spells", c.spells],
      ["monsters", c.monsters],
      ["classes", c.classes],
      ["conditions", c.conditions],
      ["species", c.species],
      ["backgrounds", c.backgrounds],
      ["feats", c.feats],
      ["weapons", c.weapons],
      ["armor", c.armor],
      ["magic items", c.magic_items],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`);
  return parts.join(", ") || "nothing yet";
}

function DocumentEntry({ doc }: { doc: Doc }) {
  return (
    <article className="card credit" id={`doc-${doc.key}`}>
      <h3>{doc.displayName}</h3>
      <dl className="props">
        <div>
          <dt>Document</dt>
          <dd>
            <ExternalLink href={doc.url}>{doc.name}</ExternalLink>
          </dd>
        </div>
        <div>
          <dt>Publisher</dt>
          <dd>{doc.publisher}</dd>
        </div>
        {doc.author && (
          <div>
            <dt>Author</dt>
            <dd>{doc.author}</dd>
          </div>
        )}
        <div>
          <dt>Licence</dt>
          <dd>
            {doc.licenses.length === 0 && (doc.visibility === "private" ? "Owner's private copy, shown only to signed-in players" : "Not stated")}
            {doc.licenses.map((l, i) => (
              <span key={l.key}>
                {i > 0 && ", "}
                <ExternalLink href={l.url}>{l.name}</ExternalLink>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>In this app</dt>
          <dd>{counts(doc.counts)}</dd>
        </div>
      </dl>
      <p className="attribution">{doc.attribution}</p>
      {doc.copyrightNotice && <p className="attribution">{doc.copyrightNotice}</p>}
    </article>
  );
}

export function CreditsPage() {
  const docs = useApi(() => getDocuments(), "documents");
  const licenses = useApi(() => getLicenses(), "licenses");

  // The source line on a detail page links to /credits#doc-<key>; scroll once the entries exist,
  // and again whenever the hash changes (links on this page, back and forward).
  useEffect(() => {
    if (docs.status !== "ok") return;
    const scroll = () => {
      if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    };
    scroll();
    window.addEventListener("hashchange", scroll);
    window.addEventListener("popstate", scroll);
    return () => {
      window.removeEventListener("hashchange", scroll);
      window.removeEventListener("popstate", scroll);
    };
  }, [docs.status]);

  return (
    <section>
      <h1>Credits and licences</h1>
      <p>
        The rules text in this app comes from the sources below. Each is shown under its own licence, and its notice
        appears here and wherever its content is used.
      </p>
      <h2>Sources</h2>
      <Async state={docs}>{(d) => d.items.map((doc) => <DocumentEntry key={doc.key} doc={doc} />)}</Async>

      <h2>Licence texts</h2>
      <Async state={licenses}>
        {(l) =>
          l.items.map((lic) => (
            <details className="licence" key={lic.key} id={`license-${lic.key}`}>
              <summary>{lic.name}</summary>
              <p>
                <ExternalLink href={lic.url}>{lic.url ?? ""}</ExternalLink>
              </p>
              <pre>{lic.text}</pre>
            </details>
          ))
        }
      </Async>
    </section>
  );
}
