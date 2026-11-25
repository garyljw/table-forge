import { describe, expect, it } from "vitest";
import { RuleSectionListQuery } from "./api.js";
import { RuleSection } from "./rule-section.js";

const section = { id: "test_flanking", documentKey: "test-doc", name: "Test Flanking", category: "variant-rule", body: "Text." };

describe("RuleSection", () => {
  it("defaults relatedIds to empty and dmOnly to false", () => {
    expect(RuleSection.parse(section)).toEqual({ ...section, relatedIds: [], dmOnly: false });
  });
  it("keeps related ids and requires them to be slugs", () => {
    expect(RuleSection.parse({ ...section, relatedIds: ["srd_wizard"] }).relatedIds).toEqual(["srd_wizard"]);
    expect(RuleSection.safeParse({ ...section, relatedIds: ["Not A Slug"] }).success).toBe(false);
  });
  it.each([{ category: "rule" }, { body: undefined }, { name: "" }])("rejects %j", (patch) => {
    expect(RuleSection.safeParse({ ...section, ...patch }).success).toBe(false);
  });
});

describe("RuleSectionListQuery", () => {
  it("accepts every category and rejects others", () => {
    for (const category of ["optional-rule", "variant-rule", "sidebar", "hazard", "trap", "disease", "poison", "lore", "other"]) {
      expect(RuleSectionListQuery.safeParse({ category }).success).toBe(true);
    }
    expect(RuleSectionListQuery.safeParse({ category: "rule" }).success).toBe(false);
  });
});
