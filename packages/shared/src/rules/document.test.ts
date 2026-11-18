import { describe, expect, it } from "vitest";
import { DocumentLicense, HttpUrl, SourceDocument } from "./document.js";

describe("HttpUrl", () => {
  it("keeps http and https", () => {
    expect(HttpUrl.parse("https://open5e.com/x")).toBe("https://open5e.com/x");
    expect(HttpUrl.parse("http://example.com")).toBe("http://example.com");
    expect(HttpUrl.parse(null)).toBeNull();
  });
  it("turns other schemes and junk into null instead of throwing", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.org/a", "JaVaScRiPt:alert(1)", "not a url", ""]) {
      expect(HttpUrl.parse(bad), bad).toBeNull();
    }
  });
  it("applies to licences and documents, which still parse", () => {
    expect(DocumentLicense.parse({ key: "k", name: "n", url: "javascript:alert(1)" }).url).toBeNull();
    const doc = SourceDocument.parse({
      key: "x", name: "X", displayName: "X", publisher: "P", author: null, gameSystem: "5e-2014",
      licenses: [{ key: "k", name: "n", url: "javascript:alert(1)" }], attribution: "a", copyrightNotice: null,
      url: "javascript:alert(1)", publicationDate: null, origin: "open5e", visibility: "public",
    });
    expect(doc.url).toBeNull();
    expect(doc.licenses[0]?.url).toBeNull();
  });
});
