import { describe, expect, it } from "vitest";
import { RuleChapterListQuery, RuleListQuery } from "./api.js";
import { Rule, RuleChapter } from "./rulebook.js";

const chapter = { id: "srd_combat", documentKey: "srd-2014", name: "Combat", description: "Intro." };
const rule = { id: "srd_combat_attack", documentKey: "srd-2014", name: "Attack", chapterId: "srd_combat", chapterName: "Combat", order: 1, headerLevel: 3, body: "Text." };

describe("RuleChapter", () => {
  it("accepts a chapter and defaults dmOnly", () => {
    expect(RuleChapter.parse(chapter)).toEqual({ ...chapter, dmOnly: false });
  });
  it("accepts an empty description", () => {
    expect(RuleChapter.safeParse({ ...chapter, description: "" }).success).toBe(true);
  });
  it.each([{ name: "" }, { id: "Not A Slug" }, { description: undefined }])("rejects %j", (patch) => {
    expect(RuleChapter.safeParse({ ...chapter, ...patch }).success).toBe(false);
  });
});

describe("Rule", () => {
  it("accepts a rule", () => {
    expect(Rule.parse(rule)).toEqual({ ...rule, dmOnly: false });
  });
  it("allows a rule with no stored chapter", () => {
    expect(Rule.safeParse({ ...rule, chapterId: null, chapterName: null }).success).toBe(true);
  });
  it.each([{ headerLevel: 0 }, { headerLevel: 7 }, { order: -1 }, { order: 1.5 }, { body: undefined }, { chapterId: "Bad Id" }])("rejects %j", (patch) => {
    expect(Rule.safeParse({ ...rule, ...patch }).success).toBe(false);
  });
});

describe("rule list queries", () => {
  it("parses a chapter filter and search", () => {
    expect(RuleListQuery.parse({ chapter: "srd_combat", q: "attack" })).toMatchObject({ chapter: "srd_combat", q: "attack", page: 1 });
    expect(RuleChapterListQuery.parse({ q: "combat" }).q).toBe("combat");
  });
  it("rejects a bad chapter", () => {
    expect(RuleListQuery.safeParse({ chapter: "Not A Slug" }).success).toBe(false);
  });
});
