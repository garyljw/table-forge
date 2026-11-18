import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.js";

afterEach(cleanup);

function Bomb(): never {
  throw new Error("bad record");
}

describe("ErrorBoundary", () => {
  it("shows a message instead of blanking the page", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary resetKey="a">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    vi.restoreAllMocks();
  });
});

describe("ErrorBoundary reset", () => {
  it("clears the error when the reset key changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let explode = true;
    function Maybe() {
      if (explode) throw new Error("bad");
      return <p>fine</p>;
    }
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    explode = false;
    rerender(
      <ErrorBoundary resetKey="b">
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeTruthy();
    vi.restoreAllMocks();
  });
});
