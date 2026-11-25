import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { weaponDamageLabel } from "../format.js";
import { SRD_DOCUMENT } from "../test-fixtures.js";
import { SpeciesDetailPage } from "./DetailPages.js";
import { EquipmentPage, armorApiParams, equipmentTab, weaponApiParams } from "./EquipmentPage.js";
import { RacesPage, raceApiParams, raceKind } from "./RacesPage.js";

const urls: string[] = [];
const COUNTS = { spells: 0, monsters: 0, classes: 0, conditions: 0, species: 3, backgrounds: 0, feats: 0, weapons: 1, armor: 1, magic_items: 0, roll_tables: 0 };

const elf = { id: "srd_elf", documentKey: "srd-2014", name: "Elf", parentSpecies: null };
const highElf = { id: "srd_high-elf", documentKey: "srd-2014", name: "High Elf", parentSpecies: { id: "srd_elf", name: "Elf" } };

function body(url: string): unknown {
  if (url.startsWith("/api/rules/documents")) return { items: [{ ...SRD_DOCUMENT, counts: COUNTS }] };
  const page = (items: unknown[]) => ({ items, page: 1, pageSize: 30, total: items.length, totalPages: 1 });
  if (url.startsWith("/api/rules/species/srd_elf"))
    return { data: { ...elf, description: "Elves are graceful.", traits: [{ name: "Darkvision", description: "See in the dark.", type: null }] }, document: SRD_DOCUMENT, subspecies: [highElf] };
  if (url.startsWith("/api/rules/species")) return page(url.includes("kind=subspecies") ? [highElf] : [elf]);
  if (url.startsWith("/api/rules/weapons"))
    return page([{ id: "srd_longsword", documentKey: "srd-2014", name: "Longsword", category: "martial", kind: "melee", damageDice: "1d8", damageType: "slashing" }]);
  if (url.startsWith("/api/rules/armor"))
    return page([
      { id: "srd_chain-mail", documentKey: "srd-2014", name: "Chain Mail", category: "heavy", acBase: 16, addsDexModifier: false, dexModifierCap: null, strengthRequired: 13, stealthDisadvantage: true, acDisplay: "16" },
    ]);
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

describe("races list", () => {
  it("shows base races by default and lets the reader switch to subraces", async () => {
    const loc = renderAt("/races", <RacesPage />);
    await screen.findByText("Elf");
    expect(urls.some((u) => u.startsWith("/api/rules/species") && u.includes("kind=species"))).toBe(true);
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "subrace" } });
    await screen.findByText("Subrace of Elf");
    expect(loc.history.at(-1)).toBe("/races?kind=subrace");
  });

  it("maps URL parameters to API parameters", () => {
    expect(raceKind(new URLSearchParams("kind=bogus"))).toBe("");
    expect(raceApiParams(new URLSearchParams("")).kind).toBe("species");
    expect(raceApiParams(new URLSearchParams("kind=subrace")).kind).toBe("subspecies");
    expect(raceApiParams(new URLSearchParams("kind=all")).kind).toBeUndefined();
  });
});

describe("race detail", () => {
  it("shows traits, subraces under their parent and the source line", async () => {
    renderAt("/races/srd_elf", <SpeciesDetailPage id="srd_elf" />);
    await screen.findByText("Darkvision");
    expect(screen.getByText("High Elf")).toBeTruthy();
    expect(screen.getByText("Subraces")).toBeTruthy();
    expect(screen.getByText(/Source:/)).toBeTruthy();
  });
});

describe("equipment", () => {
  it("lists weapons first, with a tab to armor", async () => {
    renderAt("/equipment", <EquipmentPage />);
    await screen.findByText("Longsword");
    expect(screen.getByText("1d8 slashing")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Weapons" }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows armor on the armor tab", async () => {
    renderAt("/equipment?tab=armor", <EquipmentPage />);
    await screen.findByText("Chain Mail");
    expect(screen.getByText("AC 16")).toBeTruthy();
    await waitFor(() => expect(urls.some((u) => u.startsWith("/api/rules/armor"))).toBe(true));
  });

  it("passes only known filters to the API", () => {
    expect(equipmentTab(new URLSearchParams("tab=armor"))).toBe("armor");
    expect(equipmentTab(new URLSearchParams("tab=x"))).toBe("weapons");
    const w = weaponApiParams(new URLSearchParams("category=martial&damageType=slashing&evil=1"));
    expect(w).toMatchObject({ category: "martial", damageType: "slashing" });
    expect(w).not.toHaveProperty("evil");
    expect(armorApiParams(new URLSearchParams("category=heavy"))).toMatchObject({ category: "heavy" });
  });
});

describe("weaponDamageLabel", () => {
  it("shows a dash when there is no damage", () => {
    expect(weaponDamageLabel("1d8", "slashing")).toBe("1d8 slashing");
    expect(weaponDamageLabel("0", "bludgeoning")).toBe("—");
    expect(weaponDamageLabel("1d4", null)).toBe("—");
  });
});
