import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { magicItemSubtitle, rarityLabel } from "../format.js";
import { SRD_DOCUMENT } from "../test-fixtures.js";
import { rollLabel } from "../components/RollTableView.js";
import { MagicItemDetailPage, RollTableDetailPage, RuleSectionDetailPage } from "./DetailPages.js";
import { MagicItemsPage, magicItemApiParams } from "./MagicItemsPage.js";
import { RollTablesPage, rollTableApiParams } from "./RollTablesPage.js";
import { RuleSectionsPage, ruleSectionApiParams } from "./RuleSectionsPage.js";

const urls: string[] = [];
const COUNTS = { spells: 0, monsters: 0, classes: 0, conditions: 0, species: 0, backgrounds: 0, feats: 0, weapons: 0, armor: 0, magic_items: 2, roll_tables: 1, rule_sections: 1 };

const ring = { id: "srd_test-ring", documentKey: "srd-2014", name: "Test Ring", type: "ring", rarity: "rare", requiresAttunement: true };
const potion = { id: "srd_test-potion", documentKey: "srd-2014", name: "Test Potion", type: "potion", rarity: "common", requiresAttunement: false };

function body(url: string): unknown {
  if (url.startsWith("/api/rules/documents")) return { items: [{ ...SRD_DOCUMENT, counts: COUNTS }] };
  const page = (items: unknown[]) => ({ items, page: 1, pageSize: 30, total: items.length, totalPages: 1 });
  if (url.startsWith("/api/rules/rule-sections/srd_test-pit"))
    return { data: { id: "srd_test-pit", documentKey: "srd-2014", dmOnly: false, name: "Test Pit", category: "trap", relatedIds: [], body: "A **deep** pit." }, document: SRD_DOCUMENT };
  if (url.startsWith("/api/rules/rule-sections"))
    return page([{ id: "srd_test-pit", documentKey: "srd-2014", name: "Test Pit", category: "trap" }]);
  if (url.startsWith("/api/rules/roll-tables/srd_test-loot"))
    return {
      data: {
        id: "srd_test-loot", documentKey: "srd-2014", dmOnly: false, name: "Test Loot", category: "treasure", dice: "d6", description: "Roll for **loot**.",
        columns: ["Item", "Value"],
        rows: [{ min: 1, max: 1, cells: ["A coin", "1 gp"] }, { min: 2, max: 6, cells: ["A gem", "50 gp"] }],
      },
      document: SRD_DOCUMENT,
    };
  if (url.startsWith("/api/rules/roll-tables")) return page([{ id: "srd_test-loot", documentKey: "srd-2014", name: "Test Loot", category: "treasure", dice: "d6" }]);
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
    expect(magicItemSubtitle({ type: "ring", rarity: "varies", baseItem: null, requiresAttunement: false, attunementDetail: null })).toBe("Ring, rarity varies");
  });

  it("labels rarities", () => {
    expect(rarityLabel("very-rare")).toBe("very rare");
    expect(rarityLabel("varies")).toBe("rarity varies");
    expect(rarityLabel("rare")).toBe("rare");
  });
});

describe("roll tables", () => {
  it("lists with category and dice, and filters through the URL", async () => {
    const loc = renderAt("/roll-tables", <RollTablesPage />);
    await screen.findByText("Test Loot");
    expect(screen.getByText("Treasure · d6")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "madness" } });
    expect(loc.history.at(-1)).toBe("/roll-tables?category=madness");
    expect(rollTableApiParams(new URLSearchParams("category=npc&evil=1"))).not.toHaveProperty("evil");
  });

  it("renders the table with the die as the first heading and ranges for multi-roll rows", async () => {
    renderAt("/roll-tables/srd_test-loot", <RollTableDetailPage id="srd_test-loot" />);
    await screen.findByRole("table");
    const headings = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headings).toEqual(["d6", "Item", "Value"]);
    const rows = screen.getAllByRole("row").map((r) => r.textContent);
    expect(rows[1]).toBe("1A coin1 gp");
    expect(rows[2]).toBe("2\u20136A gem50 gp");
    expect(screen.getByText("loot").tagName).toBe("STRONG");
    expect(screen.getByText(/Source:/)).toBeTruthy();
  });

  it("labels single and ranged rolls", () => {
    expect(rollLabel(3, 3)).toBe("3");
    expect(rollLabel(4, 6)).toBe("4\u20136");
  });
});

describe("rules sections", () => {
  it("lists with category and filters through the URL", async () => {
    const loc = renderAt("/rules", <RuleSectionsPage />);
    await screen.findByText("Test Pit");
    expect(document.querySelector(".row-sub")?.textContent).toBe("Trap");
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "lore" } });
    expect(loc.history.at(-1)).toBe("/rules?category=lore");
    expect(ruleSectionApiParams(new URLSearchParams("category=trap&evil=1"))).not.toHaveProperty("evil");
  });

  it("shows the markdown body and the source line", async () => {
    renderAt("/rules/srd_test-pit", <RuleSectionDetailPage id="srd_test-pit" />);
    await screen.findByText("deep");
    expect(screen.getByText("deep").tagName).toBe("STRONG");
    expect(screen.getByText(/Source:/)).toBeTruthy();
  });
});
