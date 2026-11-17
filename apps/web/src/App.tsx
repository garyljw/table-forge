import { HealthResponse } from "@table-forge/shared";
import { useEffect, useState } from "react";

type State =
  | { status: "loading" }
  | { status: "ok"; health: HealthResponse }
  | { status: "error"; message: string };

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`Server answered ${res.status}`);
  return HealthResponse.parse(await res.json());
}

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchHealth().then(
      (health) => {
        if (!cancelled) setState({ status: "ok", health });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>table-forge</h1>
      {state.status === "loading" && <p>Checking server...</p>}
      {state.status === "ok" && (
        <p>
          Server is up: {state.health.service} v{state.health.version}
        </p>
      )}
      {state.status === "error" && <p role="alert">Could not reach the server: {state.message}</p>}
      <footer style={{ marginTop: "3rem", fontSize: "0.8rem", color: "#555" }}>
        <p>
          This work includes material from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC,
          available at{" "}
          <a href="https://dnd.wizards.com/resources/systems-reference-document">
            https://dnd.wizards.com/resources/systems-reference-document
          </a>
          . The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/legalcode">
            https://creativecommons.org/licenses/by/4.0/legalcode
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
