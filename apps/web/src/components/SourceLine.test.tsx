import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SRD_DOCUMENT as FIXTURE } from "../test-fixtures.js";
import { SourceLine } from "./SourceLine.js";

const SRD_DOCUMENT = { ...FIXTURE, licenses: [...FIXTURE.licenses] };

afterEach(cleanup);

describe("SourceLine", () => {
  it("names the document and its licence", () => {
    render(<SourceLine document={SRD_DOCUMENT} />);
    expect(screen.getByText("5e 2014 Rules")).toBeTruthy();
    expect(screen.getByText(/Creative Commons Attribution 4.0/)).toBeTruthy();
  });

  it("calls a private book the owner's copy, not an unlicensed source", () => {
    render(<SourceLine document={{ ...SRD_DOCUMENT, key: "mm-2014", displayName: "Monster Manual (2014)", licenses: [], origin: "private", visibility: "private" }} />);
    expect(screen.getByText("Monster Manual (2014)")).toBeTruthy();
    expect(screen.getByText(/owner's private copy/)).toBeTruthy();
    expect(screen.queryByText(/licence not stated/)).toBeNull();
  });

  it("shows the licence names of a private document that has any", () => {
    render(<SourceLine document={{ ...SRD_DOCUMENT, key: "kp", displayName: "Some Book", origin: "private", visibility: "private" }} />);
    expect(screen.getByText(/Creative Commons Attribution 4.0/)).toBeTruthy();
    expect(screen.queryByText(/owner's private copy/)).toBeNull();
  });
});
