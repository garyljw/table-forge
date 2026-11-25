import { describe, expect, it } from "vitest";
import { MagicItemListQuery } from "./api.js";
import { MagicItem } from "./magic-item.js";

const item = {
  id: "test_ring",
  documentKey: "test-doc",
  name: "Test Ring",
  type: "ring",
  rarity: "rare",
  requiresAttunement: true,
  baseItem: null,
  attunementDetail: "by a wizard",
  description: "A ring.",
  sentient: false,
  cursed: false,
};

describe("MagicItem", () => {
  it("accepts a valid item", () => {
    expect(MagicItem.parse(item)).toEqual({ ...item, dmOnly: false });
  });
  it("defaults dmOnly to false, so records stored before the field existed still parse", () => {
    expect(MagicItem.parse(item).dmOnly).toBe(false);
    expect(MagicItem.parse({ ...item, dmOnly: true }).dmOnly).toBe(true);
  });
  it.each([{ type: "gem" }, { rarity: "mythic" }, { requiresAttunement: "yes" }, { cursed: undefined }, { name: "" }])("rejects %j", (patch) => {
    expect(MagicItem.safeParse({ ...item, ...patch }).success).toBe(false);
  });
});

describe("MagicItemListQuery", () => {
  it("parses filters", () => {
    expect(MagicItemListQuery.parse({ type: "ring", rarity: "very-rare", attunement: "false" })).toMatchObject({ type: "ring", rarity: "very-rare", attunement: false });
  });
  it.each([{ type: "Ring" }, { rarity: "mythic" }, { attunement: "1" }])("rejects %j", (q) => {
    expect(MagicItemListQuery.safeParse(q).success).toBe(false);
  });
});
