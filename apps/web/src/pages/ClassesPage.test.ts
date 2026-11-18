import { describe, expect, it } from "vitest";
import { classApiParams, classKind } from "./ClassesPage.js";

describe("classes kind filter", () => {
  it("maps unknown or class values to the default, so the control and the API agree", () => {
    for (const q of ["", "kind=class", "kind=bogus", "kind="]) {
      expect(classKind(new URLSearchParams(q))).toBe("");
      expect(classApiParams(new URLSearchParams(q)).kind).toBe("class");
    }
  });
  it("passes subclass, and omits the filter for all", () => {
    expect(classApiParams(new URLSearchParams("kind=subclass")).kind).toBe("subclass");
    expect(classApiParams(new URLSearchParams("kind=all")).kind).toBeUndefined();
  });
});
