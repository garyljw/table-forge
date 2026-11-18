import { useEffect, useState } from "react";
import { ApiRequestError } from "../api/client.js";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; message: string; notFound: boolean };

/** Run a fetch whenever `key` changes; stale responses are ignored and in-flight ones aborted. */
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, key: string): ApiState<T> {
  const [stored, setStored] = useState<{ key: string; state: ApiState<T> } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal).then(
      (data) => {
        if (!ctrl.signal.aborted) setStored({ key, state: { status: "ok", data } });
      },
      (err: unknown) => {
        if (ctrl.signal.aborted) return;
        const notFound = err instanceof ApiRequestError && err.status === 404;
        setStored({ key, state: { status: "error", notFound, message: err instanceof Error ? err.message : String(err) } });
      },
    );
    return () => ctrl.abort();
    // `key` stands in for everything `load` closes over.
  }, [key]);
  // Whatever was stored for a different key is stale, so it counts as loading.
  return stored !== null && stored.key === key ? stored.state : { status: "loading" };
}
