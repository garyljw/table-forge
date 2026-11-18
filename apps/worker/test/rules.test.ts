import {
  ApiError,
  ClassDetailResponse,
  ClassListResponse,
  ConditionDetailResponse,
  ConditionListResponse,
  DocumentListResponse,
  LicenseListResponse,
  MonsterDetailResponse,
  MonsterListResponse,
  SpellDetailResponse,
  SpellListResponse,
} from "@table-forge/shared";
import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { klass, openBundle, runStatements, SEED, seedRules, spell } from "./seed.js";

async function get(path: string): Promise<Response> {
  return exports.default.fetch(new Request(`https://example.com/api/rules${path}`));
}

async function names(path: string): Promise<string[]> {
  const res = await get(path);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { items: { name: string }[] };
  return body.items.map((i) => i.name);
}

beforeEach(async () => {
  await seedRules();
});

describe("spells list", () => {
  it("lists public spells ordered by name, and never serves private documents", async () => {
    const res = await get("/spells");
    expect(res.status).toBe(200);
    const body = SpellListResponse.parse(await res.json());
    expect(body.total).toBe(6);
    expect(body.items.map((s) => s.name)).toEqual(["100% Pure_Fire", "Cure Wounds", "Dark Flame", "Detect Magic", "Fire Bolt", "Fireball"]);
    expect(JSON.stringify(body)).not.toContain("Hidden Fire Spell");
  });

  it("returns summary fields", async () => {
    const body = SpellListResponse.parse(await (await get("/spells?q=fireball")).json());
    expect(body.items).toEqual([
      {
        id: "srd_fireball",
        documentKey: "srd-2014",
        name: "Fireball",
        level: 3,
        school: "evocation",
        classes: ["sorcerer", "wizard"],
        concentration: false,
        ritual: false,
        castingTime: "action",
        range: "150 feet",
      },
    ]);
  });

  it("searches names case-insensitively", async () => {
    expect(await names("/spells?q=FIRE")).toEqual(["100% Pure_Fire", "Fire Bolt", "Fireball"]);
  });

  it("treats LIKE wildcards in the search as literal text", async () => {
    expect(await names("/spells?q=%25")).toEqual(["100% Pure_Fire"]);
    expect(await names("/spells?q=_")).toEqual(["100% Pure_Fire"]);
    expect(await names("/spells?q=%25%25")).toEqual([]);
  });

  it("matches names without regard to accents or case", async () => {
    await runStatements(openBundle("run-1", { spells: [spell("srd_eowyn", "\u00c9owyn\u2019s Bl\u00e9ssing")] }));
    expect(await names("/spells?q=eowyn")).toEqual(["\u00c9owyn\u2019s Bl\u00e9ssing"]);
    expect(await names("/spells?q=" + encodeURIComponent("\u00c9OWYN"))).toEqual(["\u00c9owyn\u2019s Bl\u00e9ssing"]);
    expect(await names("/spells?q=" + encodeURIComponent("blessing"))).toEqual(["\u00c9owyn\u2019s Bl\u00e9ssing"]);
    expect(await names("/spells?q=" + encodeURIComponent("bl\u00e9ssing"))).toEqual(["\u00c9owyn\u2019s Bl\u00e9ssing"]);
  });

  it("handles a search term longer than D1's 50-byte LIKE pattern limit", async () => {
    expect(await names(`/spells?q=${"a".repeat(100)}`)).toEqual([]);
    expect(await names(`/spells?q=${"fireball".repeat(12)}`)).toEqual([]);
    expect((await get(`/monsters?q=${"b".repeat(100)}`)).status).toBe(200);
  });

  it("rejects a search that folds to nothing, rather than matching everything", async () => {
    const res = await get("/spells?q=%CC%81");
    expect(res.status).toBe(400);
    expect(ApiError.parse(await res.json()).issues?.[0]?.path).toBe("q");
    expect((await get("/monsters?q=%CC%81%CC%82")).status).toBe(400);
  });

  it("is not open to SQL injection through q", async () => {
    expect(await names("/spells?q=" + encodeURIComponent("'; DROP TABLE spells; --"))).toEqual([]);
    expect((await names("/spells")).length).toBe(6);
  });

  it("filters by level, school, class, concentration, ritual and document", async () => {
    expect(await names("/spells?level=0")).toEqual(["Fire Bolt"]);
    expect(await names("/spells?school=divination")).toEqual(["Detect Magic"]);
    expect(await names("/spells?class=sorcerer")).toEqual(["Fire Bolt", "Fireball"]);
    expect(await names("/spells?class=cleric&level=1")).toEqual(["Cure Wounds", "Detect Magic"]);
    expect(await names("/spells?concentration=true")).toEqual(["Detect Magic"]);
    expect(await names("/spells?ritual=true")).toEqual(["Detect Magic"]);
    expect(await names("/spells?ritual=false&level=1")).toEqual(["Cure Wounds"]);
    expect(await names("/spells?document=tob")).toEqual(["Dark Flame"]);
  });

  it("treats LIKE wildcards in the class filter as literal text", async () => {
    expect(await names("/spells?class=wi_ard")).toEqual([]);
    expect(await names(`/spells?class=${"w".repeat(100)}`)).toEqual([]);
    expect(await names("/spells?class=wizard")).toEqual(["100% Pure_Fire", "Fire Bolt", "Fireball"]);
  });

  it("does not serve a private document even when asked for it by key", async () => {
    expect(await names("/spells?document=secret-book")).toEqual([]);
  });

  it("paginates", async () => {
    const page1 = SpellListResponse.parse(await (await get("/spells?pageSize=4")).json());
    expect(page1).toMatchObject({ page: 1, pageSize: 4, total: 6, totalPages: 2 });
    expect(page1.items).toHaveLength(4);
    const page2 = SpellListResponse.parse(await (await get("/spells?pageSize=4&page=2")).json());
    expect(page2.items.map((s) => s.name)).toEqual(["Fire Bolt", "Fireball"]);
    const past = SpellListResponse.parse(await (await get("/spells?pageSize=4&page=9")).json());
    expect(past.items).toEqual([]);
    expect(past.total).toBe(6);
  });
});

describe("spell detail", () => {
  it("returns the full record with its document's attribution", async () => {
    const res = await get("/spells/srd_fireball");
    expect(res.status).toBe(200);
    const body = SpellDetailResponse.parse(await res.json());
    expect(body.data).toMatchObject({ id: "srd_fireball", damageRoll: "8d6", damageTypes: ["fire"] });
    expect(body.document.key).toBe("srd-2014");
    expect(body.document.attribution).toBe("SRD ATTRIBUTION TEXT");
    expect(body.document.licenses[0]?.name).toContain("Creative Commons");
  });

  it("uses the right document for third-party content", async () => {
    const body = SpellDetailResponse.parse(await (await get("/spells/tob_dark-flame")).json());
    expect(body.document.attribution).toBe("TOB ATTRIBUTION TEXT");
  });

  it("404s for an unknown id", async () => {
    const res = await get("/spells/nope");
    expect(res.status).toBe(404);
    expect(ApiError.parse(await res.json()).error).toBe("Spell not found");
  });

  it("404s for a malformed id and for a private document's record", async () => {
    expect((await get("/spells/%27%3B%20drop")).status).toBe(404);
    expect((await get("/spells/secret_hidden-spell")).status).toBe(404);
  });
});

describe("monsters", () => {
  it("lists, filters and searches", async () => {
    const all = MonsterListResponse.parse(await (await get("/monsters")).json());
    expect(all.total).toBe(4);
    expect(all.items.map((m) => m.name)).toEqual(["Adult Red Dragon", "Fire Imp", "Goblin", "Owlbear"]);
    expect(all.items.find((m) => m.id === "srd_goblin")).toEqual({
      id: "srd_goblin",
      documentKey: "srd-2014",
      name: "Goblin",
      size: "small",
      type: "humanoid",
      challengeRating: 0.25,
      armorClass: 15,
      hitPoints: 7,
    });
    expect(await names("/monsters?q=fire")).toEqual(["Fire Imp"]);
    expect(await names("/monsters?type=dragon")).toEqual(["Adult Red Dragon"]);
    expect(await names("/monsters?size=large")).toEqual(["Owlbear"]);
    expect(await names("/monsters?document=tob")).toEqual(["Fire Imp"]);
  });

  it("filters by challenge rating range, including fractions", async () => {
    expect(await names("/monsters?crMax=0.25")).toEqual(["Fire Imp", "Goblin"]);
    expect(await names("/monsters?crMin=3")).toEqual(["Adult Red Dragon", "Owlbear"]);
    expect(await names("/monsters?crMin=1&crMax=5")).toEqual(["Owlbear"]);
  });

  it("returns a full stat block with attribution", async () => {
    const res = await get("/monsters/srd_adult-red-dragon");
    expect(res.status).toBe(200);
    const body = MonsterDetailResponse.parse(await res.json());
    expect(body.data.hitPoints).toBe(256);
    expect(body.data.actions[0]?.name).toBe("Slam");
    expect(body.document.attribution).toBe("SRD ATTRIBUTION TEXT");
  });

  it("404s for unknown and private ids", async () => {
    expect((await get("/monsters/srd_nope")).status).toBe(404);
    expect((await get("/monsters/secret_hidden-beast")).status).toBe(404);
  });
});

describe("classes", () => {
  it("lists classes and subclasses, and filters between them", async () => {
    const all = ClassListResponse.parse(await (await get("/classes")).json());
    expect(all.items.map((c) => c.name)).toEqual(["Fighter", "Path of Tomes", "School of Evocation", "Wizard"]);
    expect(await names("/classes?kind=class")).toEqual(["Fighter", "Wizard"]);
    expect(await names("/classes?kind=subclass")).toEqual(["Path of Tomes", "School of Evocation"]);
    expect(await names("/classes?parent=srd_wizard")).toEqual(["Path of Tomes", "School of Evocation"]);
    expect(all.items.find((c) => c.id === "srd_school-of-evocation")?.parentClass).toEqual({ id: "srd_wizard", name: "Wizard" });
  });

  it("returns a class with its public subclasses and attribution", async () => {
    const body = ClassDetailResponse.parse(await (await get("/classes/srd_wizard")).json());
    expect(body.data.features[0]?.name).toBe("Spellcasting");
    expect(body.subclasses.map((s) => s.name)).toEqual(["Path of Tomes", "School of Evocation"]);
    expect(body.document.attribution).toBe("SRD ATTRIBUTION TEXT");
  });

  it("404s for an unknown class", async () => {
    expect((await get("/classes/srd_nope")).status).toBe(404);
  });
});

describe("conditions", () => {
  it("lists and returns details", async () => {
    const list = ConditionListResponse.parse(await (await get("/conditions")).json());
    expect(list.items.map((c) => c.name)).toEqual(["Blinded", "Charmed"]);
    expect(await names("/conditions?q=blind")).toEqual(["Blinded"]);
    const detail = ConditionDetailResponse.parse(await (await get("/conditions/srd-2014_blinded")).json());
    expect(detail.data.description).toBe("Blinded text");
    expect(detail.document.key).toBe("srd-2014");
    expect((await get("/conditions/srd-2014_nope")).status).toBe(404);
  });
});

describe("documents", () => {
  it("lists public documents with counts, for the credits page", async () => {
    const body = DocumentListResponse.parse(await (await get("/documents")).json());
    expect(body.items.map((d) => d.key)).toEqual(["srd-2014", "tob"]);
    const srd = body.items[0];
    expect(srd?.counts).toEqual({ spells: 5, monsters: 3, classes: 3, conditions: 2 });
    expect(srd?.attribution).toBe("SRD ATTRIBUTION TEXT");
    expect(body.items[1]?.copyrightNotice).toBe("Tome of Beasts Copyright 2016, Kobold Press.");
    expect(JSON.stringify(body)).not.toContain("secret-book");
  });
});

describe("documents with an unsafe url", () => {
  it("still returns 200, with the url nulled", async () => {
    await env.DB.prepare("UPDATE documents SET data = json_set(data, '$.url', 'javascript:alert(1)', '$.licenses[0].url', 'data:text/html,x') WHERE key = 'srd-2014'").run();
    const res = await get("/documents");
    expect(res.status).toBe(200);
    const body = DocumentListResponse.parse(await res.json());
    expect(body.items[0]?.url).toBeNull();
    expect(body.items[0]?.licenses[0]?.url).toBeNull();
    expect(JSON.stringify(body)).not.toContain("javascript:");
    expect((await get("/spells/srd_fireball")).status).toBeLessThan(500);
  });
});

describe("licenses", () => {
  it("serves the full licence texts", async () => {
    const body = LicenseListResponse.parse(await (await get("/licenses")).json());
    expect(body.items.map((l) => [l.key, l.text])).toEqual([
      ["cc-by-40", "CC TEXT"],
      ["ogl-10a", "OGL TEXT"],
    ]);
  });
});

describe("licenses and private documents", () => {
  it("only returns licences used by a public document", async () => {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO licenses (key, origin, name, url, text) VALUES ('private-lic', 'private', 'Private Licence', NULL, 'PRIVATE TEXT')"),
      env.DB.prepare("INSERT INTO licenses (key, origin, name, url, text) VALUES ('unused-lic', 'open5e', 'Unused Licence', NULL, 'UNUSED TEXT')"),
      env.DB
        .prepare("INSERT INTO documents (key, origin, visibility, name, display_name, game_system, data) VALUES ('secret-2', 'private', 'private', 'S2', 'S2', '5e-2014', ?)")
        .bind(JSON.stringify({ licenses: [{ key: "private-lic", name: "Private Licence", url: null }] })),
    ]);
    const body = LicenseListResponse.parse(await (await get("/licenses")).json());
    expect(body.items.map((l) => l.key)).toEqual(["cc-by-40", "ogl-10a"]);
    expect(JSON.stringify(body)).not.toContain("PRIVATE TEXT");
  });
});

describe("class subclasses", () => {
  it("returns every subclass, not just the first 100", async () => {
    const many = Array.from({ length: 120 }, (_, i) => klass(`srd_sub-${String(i).padStart(3, "0")}`, `Sub ${i}`, { parentClass: { id: "srd_fighter", name: "Fighter" } }));
    await runStatements(openBundle("run-1", { classes: [...SEED.classes.filter((c) => c.documentKey !== "secret-book"), ...many] }));
    const body = ClassDetailResponse.parse(await (await get("/classes/srd_fighter")).json());
    expect(body.subclasses).toHaveLength(120);
  });
});

describe("subclass whose parent is not stored", () => {
  it("stays a subclass: kind filters agree, and the parent has no id", async () => {
    const orphan = klass("srd_orphan", "Orphan Path", { parentClass: { id: null, name: "Artificer" } });
    await runStatements(openBundle("run-1", { classes: [...SEED.classes.filter((c) => c.documentKey !== "secret-book"), orphan] }));
    expect(await names("/classes?kind=subclass")).toContain("Orphan Path");
    expect(await names("/classes?kind=class")).not.toContain("Orphan Path");
    const body = ClassDetailResponse.parse(await (await get("/classes/srd_orphan")).json());
    expect(body.data.parentClass).toEqual({ id: null, name: "Artificer" });
  });
});

describe("bad parameters give 400", () => {
  it.each([
    "/spells?level=10",
    "/spells?level=abc",
    "/spells?level=",
    "/spells?level=-1",
    "/spells?level=1.5",
    "/spells?concentration=yes",
    "/spells?school=Evocation%20Drop",
    "/spells?page=0",
    "/spells?page=abc",
    "/spells?pageSize=0",
    "/spells?pageSize=101",
    `/spells?q=${"x".repeat(101)}`,
    "/spells?q=",
    "/spells?document=NOT%20A%20SLUG",
    "/monsters?crMin=abc",
    "/monsters?crMax=31",
    "/classes?kind=other",
  ])("%s", async (path) => {
    const res = await get(path);
    expect(res.status).toBe(400);
    const body = ApiError.parse(await res.json());
    expect(body.error).toBe("Invalid query parameters");
    expect(body.issues?.length).toBeGreaterThan(0);
  });

  it("accepts the largest page size", async () => {
    expect((await get("/spells?pageSize=100")).status).toBe(200);
  });
});
