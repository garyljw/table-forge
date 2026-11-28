import { DocumentListResponse } from "@table-forge/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { getAs, OTHER_USER, SERVICE_TOKEN, USER, type TestCaller } from "./identities.js";
import { addBook, own, seedRules } from "./seed.js";
import { env } from "cloudflare:workers";
import { foldName } from "@table-forge/core";
import { spell } from "./seed.js";
import { maskingClause } from "../src/rules/db.js";

// Whole-book rule: owning `mm-2014` hides every `srd-2014` monster; owning `phb-2014` hides every `srd-2014` spell. All rows are invented.
beforeEach(async () => {
  await seedRules();
  await addBook("mm-2014");
  await addBook("phb-2014");
  await addBook("dmg-2014");
  await addBookSpell("phb-2014");
  await addBookSpell("mm-2014");
});

/** One invented spell "<key> Spell" in a book, so spell masking can be told apart from the SRD's. */
async function addBookSpell(key: string): Promise<void> {
  const sp = spell(`${key}_spell`, `${key} Spell`, { documentKey: key });
  await env.DB.prepare("INSERT INTO spells (id, document_key, name, name_search, level, school, classes, concentration, ritual, casting_time, range_text, data) VALUES (?, ?, ?, ?, 1, 'evocation', '', 0, 0, 'action', '60 feet', ?)")
    .bind(sp.id, key, sp.name, foldName(sp.name), JSON.stringify(sp))
    .run();
}

async function list(caller: TestCaller, path: string): Promise<{ items: { id: string; name: string }[]; total: number }> {
  const res = await getAs(caller, path);
  expect(res.status).toBe(200);
  return (await res.json()) as { items: { id: string; name: string }[]; total: number };
}
const names = async (caller: TestCaller, path: string) => (await list(caller, path)).items.map((i) => i.name);
const counts = async (caller: TestCaller, key: string) =>
  DocumentListResponse.parse(await (await getAs(caller, "/documents")).json()).items.find((d) => d.key === key)?.counts;

describe("an owner of mm-2014", () => {
  beforeEach(async () => {
    await own(USER.email, "mm-2014");
  });

  it("sees no SRD monsters in lists, search or totals, but sees the book's", async () => {
    const all = await names(USER, "/monsters");
    expect(all).not.toContain("Goblin");
    expect(all).not.toContain("Owlbear");
    expect(all).toContain("mm-2014 Beast");
    expect(await names(USER, "/monsters?q=goblin")).toEqual([]);
    expect(await names(USER, "/monsters?document=srd-2014")).toEqual([]);
    // 3 SRD hidden; Fire Imp (tob) + the mm-2014 beast remain.
    expect((await list(USER, "/monsters")).total).toBe(2);
  });

  it("still sees third-party monsters", async () => {
    expect(await names(USER, "/monsters")).toContain("Fire Imp");
  });

  it("still sees SRD records in other tables", async () => {
    expect(await names(USER, "/spells")).toContain("Fireball");
    expect(await names(USER, "/classes")).toContain("Wizard");
    expect((await list(USER, "/spells")).total).toBe(7);
  });

  it("applies the masking to the per-document counts", async () => {
    expect((await counts(USER, "srd-2014"))?.monsters).toBe(0);
    expect((await counts(USER, "srd-2014"))?.spells).toBe(5);
    expect((await counts(USER, "mm-2014"))?.spells).toBe(1);
    expect((await counts(USER, "tob"))?.monsters).toBe(1);
    expect((await counts(USER, "mm-2014"))?.monsters).toBe(1);
  });

  it("still opens an SRD monster by id", async () => {
    const res = await getAs(USER, "/monsters/srd_goblin");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe("Goblin");
    expect(JSON.stringify(body)).not.toContain("supersededBy");
  });
});

describe.each([
  ["a signed-in user who owns no book", OTHER_USER],
  ["a caller who is not a user", SERVICE_TOKEN],
] as [string, TestCaller][])("%s", (_label, caller) => {
  it("sees every SRD spell, and none of the private books'", async () => {
    const all = await names(caller, "/spells");
    expect(all).toEqual(expect.arrayContaining(["Fireball", "Fire Bolt", "Detect Magic", "Cure Wounds"]));
    expect(all).not.toContain("phb-2014 Spell");
    expect(all).not.toContain("mm-2014 Spell");
    expect((await list(caller, "/spells")).total).toBe(6);
    expect((await counts(caller, "srd-2014"))?.spells).toBe(5);
    expect((await getAs(caller, "/spells/phb-2014_spell")).status).toBe(404);
  });

  it("sees every SRD monster, and none of the private book's", async () => {
    const all = await names(caller, "/monsters");
    expect(all).toEqual(expect.arrayContaining(["Goblin", "Owlbear", "Adult Red Dragon"]));
    expect(all).not.toContain("mm-2014 Beast");
    expect((await list(caller, "/monsters")).total).toBe(4);
    expect((await counts(caller, "srd-2014"))?.monsters).toBe(3);
  });

  it("opens an SRD monster by id", async () => {
    expect((await getAs(caller, "/monsters/srd_goblin")).status).toBe(200);
  });
});

describe("an owner of phb-2014", () => {
  beforeEach(async () => {
    await own(USER.email, "phb-2014");
  });

  it("sees no SRD spells in lists, search or totals, but sees the book's", async () => {
    const all = await names(USER, "/spells");
    for (const n of ["Fireball", "Fire Bolt", "Detect Magic", "Cure Wounds", "100% Pure_Fire"]) expect(all).not.toContain(n);
    expect(all).toContain("phb-2014 Spell");
    expect(await names(USER, "/spells?q=fireball")).toEqual([]);
    expect(await names(USER, "/spells?document=srd-2014")).toEqual([]);
    expect(await names(USER, "/spells?q=phb-2014")).toEqual(["phb-2014 Spell"]);
    // 5 SRD hidden; the mm spell is not owned; Dark Flame (tob) and the phb spell remain.
    expect((await list(USER, "/spells")).total).toBe(2);
  });

  it("applies the masking to the per-document counts", async () => {
    expect((await counts(USER, "srd-2014"))?.spells).toBe(0);
    expect((await counts(USER, "tob"))?.spells).toBe(1);
    expect((await counts(USER, "phb-2014"))?.spells).toBe(1);
  });

  it("never hides third-party spells", async () => {
    expect(await names(USER, "/spells")).toContain("Dark Flame");
  });

  it("still sees SRD monsters and SRD records in other tables", async () => {
    expect(await names(USER, "/monsters")).toEqual(expect.arrayContaining(["Goblin", "Owlbear", "Adult Red Dragon"]));
    expect((await counts(USER, "srd-2014"))?.monsters).toBe(3);
    expect(await names(USER, "/classes")).toContain("Wizard");
    expect(await names(USER, "/classes")).toContain("School of Evocation");
    expect((await list(USER, "/feats")).total).toBeGreaterThan(0);
    expect((await list(USER, "/backgrounds")).total).toBeGreaterThan(0);
    expect((await counts(USER, "srd-2014"))?.feats).toBeGreaterThan(0);
  });

  it("still opens an SRD spell by id (character sheets and old links reference spells by id)", async () => {
    const res = await getAs(USER, "/spells/srd_fireball");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe("Fireball");
    expect(JSON.stringify(body)).not.toContain("supersededBy");
  });

  it("still opens a class and its subclass, which carry no spell ids", async () => {
    expect((await getAs(USER, "/classes/srd_wizard")).status).toBe(200);
    expect((await getAs(USER, "/classes/srd_school-of-evocation")).status).toBe(200);
  });
});

describe("an owner of mm-2014 only", () => {
  it("still sees every SRD spell", async () => {
    await own(USER.email, "mm-2014");
    expect(await names(USER, "/spells")).toEqual(expect.arrayContaining(["Fireball", "Fire Bolt", "Detect Magic", "Cure Wounds"]));
    expect((await counts(USER, "srd-2014"))?.spells).toBe(5);
  });
});

describe("an owner of both phb-2014 and mm-2014", () => {
  it("has SRD spells and SRD monsters both hidden", async () => {
    await own(USER.email, "phb-2014", "mm-2014");
    const spells = await names(USER, "/spells");
    expect(spells).not.toContain("Fireball");
    expect(spells).toEqual(expect.arrayContaining(["phb-2014 Spell", "mm-2014 Spell", "Dark Flame"]));
    const monsters = await names(USER, "/monsters");
    expect(monsters).not.toContain("Goblin");
    expect(monsters).toContain("mm-2014 Beast");
    expect((await counts(USER, "srd-2014"))?.spells).toBe(0);
    expect((await counts(USER, "srd-2014"))?.monsters).toBe(0);
  });
});

describe("owners of other books", () => {
  it("owning dmg-2014 hides nothing yet", async () => {
    await own(USER.email, "dmg-2014");
    expect(await names(USER, "/monsters")).toEqual(expect.arrayContaining(["Goblin", "Owlbear"]));
    expect(await names(USER, "/spells")).toContain("Fireball");
    expect((await counts(USER, "srd-2014"))?.monsters).toBe(3);
    expect((await counts(USER, "srd-2014"))?.spells).toBe(5);
  });

  it("a tick for a public document grants nothing and hides nothing", async () => {
    await own(USER.email, "srd-2014", "tob", "mm-2014-not-a-book");
    expect(await names(USER, "/monsters")).toContain("Goblin");
    expect(await names(USER, "/monsters")).not.toContain("mm-2014 Beast");
    expect(await names(USER, "/spells")).toContain("Fireball");
  });

  it("a tick for mm-2014 does not apply to another user", async () => {
    await own(USER.email, "mm-2014");
    expect(await names(OTHER_USER, "/monsters")).toContain("Goblin");
  });
});

describe("mm-2014 as a public document", () => {
  it("is not an owned book: nothing is hidden", async () => {
    const { env } = await import("cloudflare:workers");
    await env.DB.prepare("UPDATE documents SET visibility = 'public' WHERE key = 'mm-2014'").run();
    await own(USER.email, "mm-2014");
    expect(await names(USER, "/monsters")).toContain("Goblin");
  });
});

describe("phb-2014 as a public document", () => {
  it("is not an owned book: nothing is hidden", async () => {
    await env.DB.prepare("UPDATE documents SET visibility = 'public' WHERE key = 'phb-2014'").run();
    await own(USER.email, "phb-2014");
    expect(await names(USER, "/spells")).toContain("Fireball");
  });
});

describe("maskingClause", () => {
  it("emits no condition without an email or for a table no book replaces", () => {
    expect(maskingClause({ email: null }, "monsters")).toBeNull();
    expect(maskingClause({ email: null }, "spells")).toBeNull();
    expect(maskingClause({ email: "a@example.com" }, "feats")).toBeNull();
    expect(maskingClause({ email: "a@example.com" }, "backgrounds")).toBeNull();
  });

  it("binds only the phb key for spells", () => {
    expect(maskingClause({ email: "a@example.com" }, "spells")?.params).toEqual(["srd-2014", "a@example.com", "phb-2014"]);
  });

  it("binds the SRD key, the email and the book keys", () => {
    const c = maskingClause({ email: "a@example.com" }, "monsters");
    expect(c?.params).toEqual(["srd-2014", "a@example.com", "mm-2014"]);
    expect(c?.sql).not.toContain("mm-2014");
    expect(c?.sql).not.toContain("a@example.com");
  });
});
