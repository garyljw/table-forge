import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Markdown, shallowestHeading } from "../components/Markdown.js";
import { referenceFacts } from "../components/ReferenceView.js";
import { costLabel, weightLabel } from "../format.js";
import { SRD_DOCUMENT } from "../test-fixtures.js";
import { ItemDetailPage, ItemSetDetailPage, RuleChapterPage } from "./DetailPages.js";
import { EquipmentPage, gearApiParams, packApiParams, equipmentTab } from "./EquipmentPage.js";
import { ReferencePage, inReadingOrder, referenceApiParams, referenceKind } from "./ReferencePage.js";
import { RulebookPage, rulebookApiParams } from "./RulebookPage.js";

const urls: string[] = [];
const COUNTS = { spells: 0, monsters: 0, classes: 0, conditions: 0, species: 0, backgrounds: 0, feats: 0, weapons: 0, armor: 0, magic_items: 0, roll_tables: 0, rule_sections: 0, rule_chapters: 2, rules: 3, items: 3, item_sets: 1, reference_entries: 4 };

const chapter = { id: "srd_combat", documentKey: "srd-2014", name: "Combat" };
const rope = { id: "srd_rope", documentKey: "srd-2014", name: "Rope", category: "adventuring-gear", costGp: 1, weightLb: 10 };
const sword = { id: "srd_longsword", documentKey: "srd-2014", name: "Longsword", category: "weapon", costGp: 15, weightLb: 3 };
const base = { documentKey: "srd-2014", dmOnly: false };
const large = { ...base, id: "core_size_large", kind: "size", name: "Large", description: "", rank: 4, spaceFeet: 10, hitDie: "d10" };
const tiny = { ...base, id: "core_size_tiny", kind: "size", name: "Tiny", description: "Tiny creatures.", rank: 1, spaceFeet: 2.5, hitDie: "d4" };
const abyssal = { ...base, id: "core_language_abyssal", kind: "language", name: "Abyssal", description: "Typical speakers are demons.", exotic: true, secret: false, script: "infernal" };

function body(url: string): unknown {
  if (url.startsWith("/api/rules/documents")) return { items: [{ ...SRD_DOCUMENT, counts: COUNTS }] };
  const page = (items: unknown[]) => ({ items, page: 1, pageSize: 30, total: items.length, totalPages: 1 });
  if (url.startsWith("/api/rules/rule-chapters/srd_combat"))
    return {
      data: { ...base, ...chapter, description: "Combat intro." },
      document: SRD_DOCUMENT,
      rules: [
        { ...base, id: "srd_combat_surprise", name: "Surprise", chapterId: "srd_combat", chapterName: "Combat", order: 1, headerLevel: 2, body: "The DM decides.\n\n### Details\n\nA surprised creature **cannot** act." },
        { ...base, id: "srd_combat_attack", name: "Attack", chapterId: "srd_combat", chapterName: "Combat", order: 2, headerLevel: 3, body: "Make an attack." },
      ],
    };
  if (url.startsWith("/api/rules/rule-chapters")) return page([chapter, { ...chapter, id: "srd_magic", name: "Magic" }]);
  if (url.startsWith("/api/rules/rules")) return page([{ ...base, id: "srd_combat_attack", name: "Attack", chapterId: "srd_combat", chapterName: "Combat" }]);
  if (url.startsWith("/api/rules/items/srd_longsword"))
    return { data: { ...base, ...sword, description: "A longsword.", size: "tiny", weaponId: "srd_longsword", armorId: null }, document: SRD_DOCUMENT };
  if (url.startsWith("/api/rules/items/srd_rope"))
    return { data: { ...base, ...rope, description: "Rope has **2** hit points.", size: "tiny", weaponId: null, armorId: null }, document: SRD_DOCUMENT };
  if (url.startsWith("/api/rules/items")) return page(url.includes("gear=true") ? [rope] : [rope, sword]);
  if (url.startsWith("/api/rules/item-sets/test-pack"))
    return { data: { ...base, id: "test-pack", name: "Test Pack", itemCount: 1, description: "Holds a rope.", items: [{ id: "srd_rope", name: "Rope" }] }, document: SRD_DOCUMENT };
  if (url.startsWith("/api/rules/item-sets")) return page([{ id: "test-pack", documentKey: "srd-2014", name: "Test Pack", itemCount: 1 }]);
  if (url.startsWith("/api/rules/reference")) {
    if (url.includes("kind=size")) return page([large, tiny]);
    if (url.includes("kind=language")) return page([abyssal]);
    return page([{ ...base, id: "srd-2014_ability_str", kind: "ability", name: "Strength", description: "Strength measures **power**.\n\n### Strength Checks", abbreviation: "str", abilityKey: "strength" }]);
  }
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

describe("rulebook", () => {
  it("lists chapters, with the source line", async () => {
    renderAt("/rulebook", <RulebookPage />);
    await screen.findByText("Combat");
    expect(screen.getByText("Magic")).toBeTruthy();
    expect(urls.some((u) => u.startsWith("/api/rules/rule-chapters"))).toBe(true);
    expect(urls.some((u) => u.startsWith("/api/rules/rules"))).toBe(false);
    await screen.findByText(/Source:/);
    expect(screen.getByRole("link", { name: "Combat" }).getAttribute("href")).toBe("/rulebook/srd_combat");
  });

  it("searches rules by name and links to the rule in its chapter", async () => {
    renderAt("/rulebook?q=attack", <RulebookPage />);
    await screen.findByText("Attack");
    expect(urls.some((u) => u.startsWith("/api/rules/rules") && u.includes("q=attack"))).toBe(true);
    expect(screen.getByRole("link", { name: /Attack/ }).getAttribute("href")).toBe("/rulebook/srd_combat#srd_combat_attack");
  });

  it("types into the search box through the URL", async () => {
    const loc = renderAt("/rulebook", <RulebookPage />);
    await screen.findByText("Combat");
    fireEvent.change(screen.getByLabelText("Search rules by name"), { target: { value: "att" } });
    await vi.waitFor(() => expect(loc.history.at(-1)).toBe("/rulebook?q=att"));
  });

  it("passes only known filters to the API", () => {
    expect(rulebookApiParams(new URLSearchParams("q=a&document=srd-2014&evil=1"))).toMatchObject({ q: "a", document: "srd-2014" });
    expect(rulebookApiParams(new URLSearchParams("evil=1"))).not.toHaveProperty("evil");
  });
});

describe("rules chapter", () => {
  it("shows its rules in order, each title at its own level with the body nested beneath", async () => {
    renderAt("/rulebook/srd_combat", <RuleChapterPage id="srd_combat" />);
    await screen.findByText("Surprise");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Combat");
    expect(screen.getByText("Combat intro.")).toBeTruthy();
    const titles = screen.getAllByRole("heading").map((h) => `${h.tagName}:${h.textContent}`);
    // Surprise (level 2) holds a "###" sub-heading that lands one level below its title; Attack is a level 3 rule.
    expect(titles).toEqual(["H1:Combat", "H2:Surprise", "H3:Details", "H3:Attack"]);
    expect(screen.getByText("cannot").tagName).toBe("STRONG");
    expect(document.getElementById("srd_combat_attack")).toBeTruthy();
    expect(screen.getByText(/Source:/)).toBeTruthy();
  });

  it("scrolls to the rule named in the link", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.location.hash = "#srd_combat_attack";
    renderAt("/rulebook/srd_combat", <RuleChapterPage id="srd_combat" />);
    await screen.findByText("Surprise");
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    window.location.hash = "";
  });
});

describe("markdown heading start", () => {
  it("finds the shallowest heading", () => {
    expect(shallowestHeading("text\n\n### A\n\n#### B")).toBe(3);
    expect(shallowestHeading("no headings")).toBeNull();
    expect(shallowestHeading("#hashtag is not a heading")).toBeNull();
  });
  it("moves headings so the shallowest lands on the start level, never past h6", () => {
    render(<Markdown headingStart={4}>{"## One\n\n#### Two\n\n###### Six"}</Markdown>);
    expect(screen.getAllByRole("heading").map((h) => h.tagName)).toEqual(["H4", "H6", "H6"]);
  });
  it("leaves headings alone without a start level", () => {
    render(<Markdown>{"## One"}</Markdown>);
    expect(screen.getByRole("heading").tagName).toBe("H2");
  });
});

describe("equipment gear and packs tabs", () => {
  it("lists gear without weapons and armor, with price and weight", async () => {
    renderAt("/equipment?tab=gear", <EquipmentPage />);
    await screen.findByText("Rope");
    expect(screen.getByText("1 gp")).toBeTruthy();
    expect(screen.getByText("Adventuring gear · 10 lb.")).toBeTruthy();
    expect(screen.queryByText("Longsword")).toBeNull();
    expect(urls.some((u) => u.startsWith("/api/rules/items") && u.includes("gear=true"))).toBe(true);
    expect(screen.getByRole("tab", { name: "Gear" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: /Rope/ }).getAttribute("href")).toBe("/equipment/gear/srd_rope");
  });

  it("includes weapons and armor when asked", async () => {
    const loc = renderAt("/equipment?tab=gear", <EquipmentPage />);
    await screen.findByText("Rope");
    fireEvent.click(screen.getByLabelText("Include weapons and armor"));
    await screen.findByText("Longsword");
    expect(loc.history.at(-1)).toContain("all=1");
    expect(urls.at(-1)).not.toContain("gear=true");
  });

  it("filters gear by category through the URL", async () => {
    const loc = renderAt("/equipment?tab=gear", <EquipmentPage />);
    await screen.findByText("Rope");
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "tools" } });
    expect(loc.history.at(-1)).toBe("/equipment?tab=gear&category=tools");
  });

  it("lists packs with their item counts", async () => {
    renderAt("/equipment?tab=packs", <EquipmentPage />);
    await screen.findByText("Test Pack");
    expect(screen.getByText("1 item")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Packs & sets" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: /Test Pack/ }).getAttribute("href")).toBe("/equipment/packs/test-pack");
  });

  it("maps URL parameters to API parameters", () => {
    expect(equipmentTab(new URLSearchParams("tab=gear"))).toBe("gear");
    expect(equipmentTab(new URLSearchParams("tab=packs"))).toBe("packs");
    expect(equipmentTab(new URLSearchParams("tab=x"))).toBe("weapons");
    expect(gearApiParams(new URLSearchParams("category=tools&evil=1"))).toMatchObject({ category: "tools", gear: "true" });
    expect(gearApiParams(new URLSearchParams("category=tools&evil=1"))).not.toHaveProperty("evil");
    expect(gearApiParams(new URLSearchParams("all=1")).gear).toBeUndefined();
    expect(packApiParams(new URLSearchParams("q=pack&category=x"))).toEqual(expect.objectContaining({ q: "pack" }));
  });
});

describe("item and pack detail", () => {
  it("shows an item with cost, weight and the source line", async () => {
    renderAt("/equipment/gear/srd_rope", <ItemDetailPage id="srd_rope" />);
    await screen.findByText("2");
    expect(screen.getByText("2").tagName).toBe("STRONG");
    expect(screen.getByText("1 gp")).toBeTruthy();
    expect(screen.getByText("10 lb.")).toBeTruthy();
    expect(screen.getByText(/Source:/)).toBeTruthy();
    expect(screen.queryByText(/damage and properties/)).toBeNull();
  });

  it("links an item to its weapon record", async () => {
    renderAt("/equipment/gear/srd_longsword", <ItemDetailPage id="srd_longsword" />);
    const link = await screen.findByRole("link", { name: /damage and properties/ });
    expect(link.getAttribute("href")).toBe("/equipment/weapons/srd_longsword");
  });

  it("lists a pack's contents, each linking to its item", async () => {
    renderAt("/equipment/packs/test-pack", <ItemSetDetailPage id="test-pack" />);
    await screen.findByText("Holds a rope.");
    expect(screen.getByRole("link", { name: "Rope" }).getAttribute("href")).toBe("/equipment/gear/srd_rope");
    expect(screen.getByText(/Source:/)).toBeTruthy();
  });
});

describe("reference page", () => {
  it("shows abilities first with the description inline and a tab for every kind", async () => {
    renderAt("/reference", <ReferencePage />);
    await screen.findByText("Strength");
    expect(screen.getByText("power").tagName).toBe("STRONG");
    expect(screen.getByText("STR")).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(12);
    expect(screen.getByRole("tab", { name: "Abilities" }).getAttribute("aria-selected")).toBe("true");
    expect(urls.some((u) => u.startsWith("/api/rules/reference") && u.includes("kind=ability"))).toBe(true);
    // The description's "###" nests below the entry's own h2.
    expect(screen.getByRole("heading", { name: "Strength Checks" }).tagName).toBe("H3");
    await screen.findByText(/Source:/);
  });

  it("shows sizes in rank order with their facts, and a note for an empty description", async () => {
    renderAt("/reference?kind=size", <ReferencePage />);
    await screen.findByText("Tiny");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Tiny", "Large"]);
    expect(screen.getByText("Space 2.5 ft.")).toBeTruthy();
    expect(screen.getByText("Hit die d10")).toBeTruthy();
    expect(screen.getByText("No description in the source.")).toBeTruthy();
  });

  it("shows language flags and script", async () => {
    renderAt("/reference?kind=language", <ReferencePage />);
    await screen.findByText("Abyssal");
    expect(screen.getByText("Exotic")).toBeTruthy();
    expect(screen.getByText("Script: Infernal")).toBeTruthy();
  });

  it("falls back to abilities for an unknown kind and passes only known parameters", () => {
    expect(referenceKind(new URLSearchParams("kind=bogus"))).toBe("ability");
    expect(referenceKind(new URLSearchParams("kind=weapon-property"))).toBe("weapon-property");
    const p = referenceApiParams(new URLSearchParams("kind=skill&q=ath&evil=1"));
    expect(p).toMatchObject({ kind: "skill", q: "ath" });
    expect(p).not.toHaveProperty("evil");
  });

  it("sorts only sizes and rarities by rank", () => {
    const entries = [large, tiny, abyssal] as unknown as Parameters<typeof inReadingOrder>[0];
    expect(inReadingOrder(entries).map((e) => e.name)).toEqual(["Tiny", "Large", "Abyssal"]);
  });

  it("describes the facts of each kind", () => {
    const facts = (e: object) => referenceFacts(e as Parameters<typeof referenceFacts>[0]);
    expect(facts({ kind: "skill", ability: "dexterity" })).toEqual(["Dexterity"]);
    expect(facts({ kind: "alignment", shortName: "LG", societalAttitude: "lawful", morality: "good" })).toEqual(["LG", "Lawful good"]);
    expect(facts({ kind: "environment", aquatic: true, planar: false, interior: true })).toEqual(["Aquatic", "Interior"]);
    expect(facts({ kind: "weapon-property", propertyType: "Mastery" })).toEqual(["Mastery"]);
    expect(facts({ kind: "weapon-property", propertyType: null })).toEqual([]);
    expect(facts({ kind: "damage-type" })).toEqual([]);
    expect(facts({ kind: "item-rarity", rank: 3 })).toEqual(["Rank 3"]);
    expect(facts({ kind: "language", exotic: false, secret: true, script: null })).toEqual(["Standard", "Secret"]);
  });
});

describe("cost and weight labels", () => {
  it("writes prices in the coin they are usually quoted in", () => {
    expect(costLabel(25)).toBe("25 gp");
    expect(costLabel(1.5)).toBe("1.5 gp");
    expect(costLabel(0.5)).toBe("5 sp");
    expect(costLabel(0.2)).toBe("2 sp");
    expect(costLabel(0.05)).toBe("5 cp");
    expect(costLabel(0.01)).toBe("1 cp");
    expect(costLabel(0)).toBe("—");
    expect(weightLabel(2.5)).toBe("2.5 lb.");
    expect(weightLabel(null)).toBe("—");
  });
});
