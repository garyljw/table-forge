import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";

export type ParamPatch = Record<string, string | undefined>;

/** Compute the next query string: apply the patch, drop empties, and reset paging unless it is being set. */
export function applyPatch(current: string, patch: ParamPatch): string {
  const sp = new URLSearchParams(current);
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") sp.delete(k);
    else sp.set(k, v);
  }
  if (!("page" in patch)) sp.delete("page");
  return sp.toString();
}

/** The page's filters live in the URL, so every view can be shared and the back button works. */
export function useQueryParams() {
  const search = useSearch();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(search);
  // Updates build on the latest URL, not the one from the last render, so two changes in a row
  // (typing, then a select) both survive before React has re-rendered.
  const latest = useRef({ search, location });
  latest.current = { search, location };
  const update = useCallback(
    (patch: ParamPatch) => {
      const qs = applyPatch(latest.current.search, patch);
      latest.current = { ...latest.current, search: qs };
      navigate(qs === "" ? latest.current.location : `${latest.current.location}?${qs}`, { replace: true });
    },
    [navigate],
  );
  return { params, search, update };
}

/** A text box whose value is pushed to the URL after a short pause. */
export function useDebouncedParam(urlValue: string, commit: (v: string) => void, delay = 300) {
  const [text, setText] = useState(urlValue);
  const lastSent = useRef(urlValue.trim());
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (urlValue.trim() !== lastSent.current) {
      lastSent.current = urlValue.trim();
      setText(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    // Compare trimmed values: the URL holds the trimmed text, so a trailing space the user is
    // still typing must never be treated as a change coming from the URL.
    if (text.trim() === lastSent.current) return;
    const t = setTimeout(() => {
      lastSent.current = text.trim();
      commitRef.current(text.trim());
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  return [text, setText] as const;
}
