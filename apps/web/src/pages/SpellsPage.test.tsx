import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRulesCache } from "../api/rules.js";
import { applyPatch } from "../hooks/useQueryParams.js";
import { SRD_DOCUMENT } from "../test-fixtures.js";
import { SpellsPage, spellApiParams } from "./SpellsPage.js";

const urls: string[] = [];

beforeEach(() => {
  urls.length = 0;
  resetRulesCache();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      urls.push(String(input));
      const body = String(input).startsWith("/api/rules/documents")
        ? { items: [{ ...SRD_DOCUMENT, counts: { spells: 3, monsters: 0, classes: 0, conditions: 0 } }] }
        : {
            items: [
              { id: "srd_fireball", documentKey: "srd-2014", name: "Fireball", level: 3, school: "evocation", classes: ["sorcerer", "wizard"], concentration: false, ritual: false, castingTime: "action", range: "150 feet" },
            ],
            page: 1, pageSize: 25, total: 1, totalPages: 1,
          };
      return new Response(JSON.stringify(body));
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const spellCalls = () => urls.filter((u) => u.startsWith("/api/rules/spells"));

function renderAt(path: string) {
  const loc = memoryLocation({ path, record: true });
  render(
    <Router hook={loc.hook} searchHook={loc.searchHook}>
      <SpellsPage />
    </Router>,
  );
  return loc;
}

describe("spell list filters and the query string", () => {
  it("passes URL filters to the API", async () => {
    renderAt("/spells?class=wizard&level=3");
    await screen.findByText("Fireball");
    const url = spellCalls()[0] ?? "";
    expect(url).toContain("class=wizard");
    expect(url).toContain("level=3");
    expect(url).not.toContain("school=");
  });

  it("writes a changed filter back to the URL and refetches", async () => {
    const loc = renderAt("/spells?class=wizard");
    await screen.findByText("Fireball");
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
    await waitFor(() => expect(loc.history.at(-1) ?? "").toMatch(/^\/spells\?(class=wizard&level=3|level=3&class=wizard)$/));
    await waitFor(() => expect(spellCalls().some((u) => u.includes("level=3") && u.includes("class=wizard"))).toBe(true));
  });

  it("sets the document filter from the SRD-only toggle", async () => {
    const loc = renderAt("/spells");
    await screen.findByText("Fireball");
    fireEvent.click(screen.getByLabelText("SRD only"));
    await waitFor(() => expect(loc.history.at(-1)).toBe("/spells?document=srd-2014"));
  });

  it("debounces the search box into the q parameter", async () => {
    const loc = renderAt("/spells");
    await screen.findByText("Fireball");
    fireEvent.change(screen.getByLabelText("Search spells by name"), { target: { value: "fire" } });
    await waitFor(() => expect(loc.history.at(-1)).toBe("/spells?q=fire"));
  });

  it("does not eat a trailing space while the user is typing", async () => {
    const loc = renderAt("/spells");
    await screen.findByText("Fireball");
    const box = screen.getByLabelText("Search spells by name") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "magic " } });
    await waitFor(() => expect(loc.history.at(-1)).toBe("/spells?q=magic"));
    await new Promise((r) => setTimeout(r, 50));
    expect(box.value).toBe("magic ");
    fireEvent.change(box, { target: { value: "magic m" } });
    expect(box.value).toBe("magic m");
  });

  it("keeps both changes when a select changes right after typing", async () => {
    const loc = renderAt("/spells");
    await screen.findByText("Fireball");
    const box = screen.getByLabelText("Search spells by name");
    fireEvent.change(box, { target: { value: "fire" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "3" } });
    await waitFor(() => expect(loc.history.at(-1)).toMatch(/q=fire/));
    expect(loc.history.at(-1)).toMatch(/level=3/);
  });

  it("offers a way back when the page is past the last one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const body = String(input).startsWith("/api/rules/documents")
          ? { items: [] }
          : { items: [], page: 9, pageSize: 25, total: 40, totalPages: 2 };
        return new Response(JSON.stringify(body));
      }),
    );
    const loc = renderAt("/spells?page=9");
    await screen.findByText("No results on this page.");
    fireEvent.click(screen.getByText("Back to page 1"));
    await waitFor(() => expect(loc.history.at(-1)).toBe("/spells"));
  });

  it("shows an error when the response is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ nonsense: true }))));
    resetRulesCache();
    renderAt("/spells");
    expect((await screen.findAllByRole("alert"))[0]?.textContent).toMatch(/unexpected shape/);
  });
});

describe("pure query helpers", () => {
  it("maps only known URL parameters to API parameters", () => {
    const p = spellApiParams(new URLSearchParams("class=wizard&level=3&evil=1&concentration=maybe"));
    expect(p).toMatchObject({ class: "wizard", level: "3", concentration: undefined });
    expect(p).not.toHaveProperty("evil");
  });
  it("applyPatch resets the page unless it is being set", () => {
    expect(applyPatch("level=3&page=4", { school: "evocation" })).toBe("level=3&school=evocation");
    expect(applyPatch("level=3", { page: "2" })).toBe("level=3&page=2");
    expect(applyPatch("level=3&q=x", { level: undefined })).toBe("q=x");
  });
});
