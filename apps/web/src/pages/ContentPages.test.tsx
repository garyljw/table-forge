import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { magicItemSubtitle } from "../format.js";
import { SRD_DOCUMENT } from "../test-fixtures.js";
import { MagicItemDetailPage } from "./DetailPages.js";
import { MagicItemsPage, magicItemApiParams } from "./MagicItemsPage.js";

const urls: string[] = [];
const COUNTS = { spells: 0, monsters: 0, classes: 0, conditions: 0, species: 0, backgrounds: 0, feats: 0, weapons: 0, armor: 0, magic_items: 2 };

const ring = { id: "srd_test-ring", documentKey: "srd-2014", name: "Test Ring", type: "ring", rarity: "rare", requiresAttunement: true };
const potion = { id: "srd_test-potion", documentKey: "srd-2014", name: "Test Potion", type: "potion", rarity: "common", requiresAttunement: false };

function body(url: string): unknown {
  if (url.startsWith("/api/rules/documents")) return { items: [{ ...SRD_DOCUMENT, counts: COUNTS }] };
  const page = (items: unknown[]) => ({ items, page: 1, pageSize: 30, total: items.length, totalPages: 1 });
  if (url.startsWith("/api/rules/magic-items/srd_test-ring"))
    return {
      data: { ...ring, baseItem: null, attunementDetail: "by a wizard", description: "A **plain** ring.", sentient: false, cursed: true },
      document: SRD_DOCUMENT,
    };
  if (url.startsWith("/api/rules/magic-items")) return page([ring, potion]);
  return page([]);
}

beforeEach(() => {
  urls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      urls.push(String(input));
      return new Response(JSON.stringify(body(String(input))));
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(path: string, ui: React.ReactNode) {
  const loc = memoryLocation({ path, record: true });
  render(
    <Router hook={loc.hook} searchHook={loc.searchHook}>
      {ui}
    </Router>,
  );
  return loc;
}

describe("magic items list", () => {
  it("shows rarity, type and an attunement tag, and filters through the URL", async () => {
    const loc = renderAt("/magic-items", <MagicItemsPage />);
    await screen.findByText("Test Ring");
    expect(screen.getByText("Ring · Rare")).toBeTruthy();
    expect(document.querySelector(".tag")?.textContent).toBe("Attunement");
    fireEvent.change(screen.getByLabelText("Rarity"), { target: { value: "rare" } });
    expect(loc.history.at(-1)).toBe("/magic-items?rarity=rare");
  });

  it("passes only known filters to the API", () => {
    const p = magicItemApiParams(new URLSearchParams("type=ring&rarity=rare&attunement=true&evil=1"));
    expect(p).toMatchObject({ type: "ring", rarity: "rare", attunement: "true" });
    expect(p).not.toHaveProperty("evil");
    expect(magicItemApiParams(new URLSearchParams("attunement=maybe")).attunement).toBeUndefined();
  });
});

describe("magic item detail", () => {
  it("shows the subtitle, flags, markdown description and the source line", async () => {
    renderAt("/magic-items/srd_test-ring", <MagicItemDetailPage id="srd_test-ring" />);
    await screen.findByText("Ring, rare (requires attunement by a wizard)");
    expect(screen.getByText("Cursed")).toBeTruthy();
    expect(screen.getByText("plain").tagName).toBe("STRONG");
    expect(screen.getByText(/Source:/)).toBeTruthy();
  });

  it("builds the subtitle", () => {
    expect(magicItemSubtitle({ type: "wondrous-item", rarity: "very-rare", baseItem: null, requiresAttunement: false, attunementDetail: null })).toBe("Wondrous item, very rare");
    expect(magicItemSubtitle({ type: "weapon", rarity: "uncommon", baseItem: "longsword", requiresAttunement: true, attunementDetail: null })).toBe("Weapon (longsword), uncommon (requires attunement)");
  });
});
