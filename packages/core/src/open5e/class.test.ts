import type { ClassDetail } from "@table-forge/shared";
import { describe, expect, it } from "vitest";
import { resolveSubclassParents } from "./class.js";

const cls = (id: string, name: string, parent: { id: string | null; name: string } | null): ClassDetail => ({
  id, documentKey: id.split("_")[0] ?? "x", name, parentClass: parent, hitDice: null, casterType: null,
  description: "", hitPoints: null, savingThrows: [], primaryAbilities: [], proficiencies: null,
  startingEquipment: null, features: [], table: [],
});

describe("resolveSubclassParents", () => {
  const base = [cls("srd_wizard", "Wizard", null), cls("srd_fighter", "Fighter", null)];
  it("leaves a parent that exists alone", () => {
    const r = resolveSubclassParents([...base, cls("toh_a", "A", { id: "srd_wizard", name: "Wizard" })]);
    expect(r.remapped).toBe(0);
    expect(r.classes[2]?.parentClass?.id).toBe("srd_wizard");
  });
  it("remaps a parent from an excluded document to the matching stored class", () => {
    const r = resolveSubclassParents([...base, cls("open5e_abj", "Abjurationist", { id: "srd-2024_wizard", name: "Wizard" })]);
    expect(r.remapped).toBe(1);
    expect(r.unresolved).toHaveLength(0);
    expect(r.classes[2]?.parentClass).toEqual({ id: "srd_wizard", name: "Wizard" });
  });
  it("keeps an unresolvable subclass a subclass, with a null parent id", () => {
    const r = resolveSubclassParents([...base, cls("x_y", "Y", { id: "srd-2024_artificer", name: "Artificer" })]);
    expect(r.unresolved.map((c) => c.id)).toEqual(["x_y"]);
    expect(r.classes[2]?.parentClass).toEqual({ id: null, name: "Artificer" });
  });
});
