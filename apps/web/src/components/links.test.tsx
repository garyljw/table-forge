import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { safeHttpUrl } from "../format.js";
import { ExternalLink } from "./ExternalLink.js";
import { Markdown } from "./Markdown.js";

afterEach(cleanup);

describe("safeHttpUrl", () => {
  it("allows http and https", () => {
    expect(safeHttpUrl("https://open5e.com/")).toBe("https://open5e.com/");
    expect(safeHttpUrl("http://example.com/a")).toBe("http://example.com/a");
  });
  it("rejects every other scheme, and junk", () => {
    for (const bad of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "ftp://x.org", "vbscript:x", "//evil.com", "", null, undefined, "not a url"]) {
      expect(safeHttpUrl(bad), String(bad)).toBeNull();
    }
  });
});

describe("ExternalLink", () => {
  it("renders a link for https", () => {
    render(<ExternalLink href="https://example.com/x">Doc</ExternalLink>);
    const a = screen.getByRole("link", { name: "Doc" });
    expect(a.getAttribute("href")).toBe("https://example.com/x");
    expect(a.getAttribute("rel")).toContain("noopener");
  });
  it("renders plain text, never a link, for javascript: URLs", () => {
    render(<ExternalLink href="javascript:alert(1)">Doc</ExternalLink>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Doc")).toBeTruthy();
  });
});

describe("Markdown", () => {
  it("shows raw HTML as text instead of running it", () => {
    const { container } = render(<Markdown>{'hello <img src=x onerror="alert(1)"> <script>alert(2)</script>'}</Markdown>);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
  it("drops javascript: links and renders tables", () => {
    const { container } = render(<Markdown>{"[x](javascript:alert(1))\n\n| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>);
    expect(container.querySelector("a")?.getAttribute("href") ?? "").not.toContain("javascript");
    expect(container.querySelector("table")).not.toBeNull();
  });
  it("renders only absolute http(s) links as links", () => {
    const { container } = render(<Markdown>{"[a](https://x.org/a) [b](/v2/spells/x) [c](#top) [d](mailto:a@b.c)"}</Markdown>);
    const links = [...container.querySelectorAll("a")];
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("target")).toBe("_blank");
    expect(links[0]?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(container.textContent).toContain("b");
  });
  it("does not render images from third-party text; shows the alt text", () => {
    const { container } = render(<Markdown>{"![a map](https://tracker.example/p.png) and ![](https://x.org/y.png)"}</Markdown>);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("a map");
    expect(container.textContent).not.toContain("tracker.example");
  });
});
