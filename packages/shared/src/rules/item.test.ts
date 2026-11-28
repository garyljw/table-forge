import { describe, expect, it } from "vitest";
import { ItemListQuery } from "./api.js";
import { Item, ItemSet } from "./item.js";

const item = {
  id: "srd_battleaxe",
  documentKey: "srd-2014",
  name: "Battleaxe",
  category: "weapon",
  costGp: 10,
  weightLb: 4,
  description: "A battleaxe.",
  size: "tiny",
  weaponId: "srd_battleaxe",
  armorId: null,
};
const set = { id: "burglars-pack", documentKey: "srd-2014", name: "Burglar's Pack", itemCount: 1, description: "Includes a backpack.", items: [{ id: "srd_backpack", name: "Backpack" }] };

describe("Item", () => {
  it("accepts an item linked to a weapon", () => {
    expect(Item.parse(item)).toEqual({ ...item, dmOnly: false });
  });
  it("accepts an item with no weight, size or links", () => {
    expect(Item.safeParse({ ...item, weightLb: null, size: null, weaponId: null }).success).toBe(true);
  });
  it.each([{ costGp: -1 }, { weightLb: -2 }, { category: "Adventuring Gear" }, { weaponId: "Bad Id" }, { name: "" }, { costGp: "5" }])("rejects %j", (patch) => {
    expect(Item.safeParse({ ...item, ...patch }).success).toBe(false);
  });
});

describe("ItemSet", () => {
  it("accepts a pack", () => {
    expect(ItemSet.parse(set)).toEqual({ ...set, dmOnly: false });
  });
  it.each([{ items: [{ id: "Bad Id", name: "x" }] }, { items: [{ id: "srd_x", name: "" }] }, { itemCount: -1 }])("rejects %j", (patch) => {
    expect(ItemSet.safeParse({ ...set, ...patch }).success).toBe(false);
  });
});

describe("ItemListQuery", () => {
  it("parses category and gear", () => {
    expect(ItemListQuery.parse({ category: "tools", gear: "true" })).toMatchObject({ category: "tools", gear: true });
  });
  it.each([{ category: "Tools" }, { gear: "1" }])("rejects %j", (q) => {
    expect(ItemListQuery.safeParse(q).success).toBe(false);
  });
});
