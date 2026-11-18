import type { ApiState } from "../hooks/useApi.js";

export function Loading({ what = "Loading" }: { what?: string }) {
  return (
    <p className="state" role="status">
      {what}…
    </p>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="state state-error" role="alert">
      {message}
    </p>
  );
}

/** Shared loading/error handling; renders `children` with the data once it has arrived. */
export function Async<T>({ state, children }: { state: ApiState<T>; children: (data: T) => React.ReactNode }) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorNote message={state.message} />;
  return <>{children(state.data)}</>;
}
