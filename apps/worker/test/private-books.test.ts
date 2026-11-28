import { foldName } from "@table-forge/core";
import { env } from "cloudflare:workers";
import { DocumentListResponse, LicenseListResponse } from "@table-forge/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { DISPLAY, EMAIL_BUT_NOT_USER, getAs, NO_IDENTITY, OTHER_USER, SERVICE_TOKEN, USER, type TestCaller } from "./identities.js";
import { addOtherBook, own, secret, SEED, seedRules } from "./seed.js";

// The seed's private document ("secret-book") holds INVENTED rows, never real book text.
const PRIVATE_MARKERS = ["Hidden", "secret_", "secret-book", "Secret Book", "PRIVATE"];

const DENIED: [string, TestCaller][] = [
  ["no identity", NO_IDENTITY],
  ["a service token", SERVICE_TOKEN],
  ["a Display identity", DISPLAY],
  ["an email on a non-user kind", EMAIL_BUT_NOT_USER],
  // Signed in, but nobody has ticked any book for them: public content only.
  ["a signed-in user who owns no book", OTHER_USER],
];

beforeEach(async () => {
  await seedRules();
});

async function names(caller: TestCaller, path: string): Promise<string[]> {
  const res = await getAs(caller, path);
  expect(res.status).toBe(200);
  return ((await res.json()) as { items: { name: string }[] }).items.map((i) => i.name);
}

/** Every list, with a private row's name and the id used for the detail checks. */
const TABLES = [
  { path: "spells", name: "Hidden Fire Spell", id: "secret_hidden-spell" },
  { path: "monsters", name: "Hidden Beast", id: "secret_hidden-beast" },
  { path: "classes", name: "Hidden Subclass", id: "secret_hidden-subclass" },
  { path: "species", name: "Hidden Species", id: "secret_hidden-species" },
  { path: "backgrounds", name: "Hidden Background", id: "secret_hidden-background" },
  { path: "feats", name: "Hidden Feat", id: "secret_hidden-feat" },
  { path: "weapons", name: "Hidden Blade", id: "secret_hidden-blade" },
  { path: "armor", name: "Hidden Plate", id: "secret_hidden-plate" },
  { path: "magic-items", name: "Hidden Idol", id: "secret_hidden-idol" },
  { path: "roll-tables", name: "Hidden Table", id: "secret_hidden-table" },
  { path: "rule-sections", name: "Hidden Section", id: "secret_hidden-section" },
  { path: "rule-chapters", name: "Hidden Chapter", id: "secret_hidden-chapter" },
  { path: "rules", name: "Hidden Rule", id: "secret_hidden-rule" },
  { path: "items", name: "Hidden Trinket", id: "secret_hidden-trinket" },
  { path: "item-sets", name: "Hidden Pack", id: "secret_hidden-pack" },
  { path: "reference", name: "Hidden Damage", id: "secret-book_damage-type_hidden" },
];

describe("an owner of the private book", () => {
  beforeEach(async () => {
    await own(USER.email, "secret-book");
  });

  it.each(TABLES)("sees private $path in the list, in search, in the document filter and in detail", async ({ path, name, id }) => {
    expect(await names(USER, `/${path}`)).toContain(name);
    expect(await names(USER, `/${path}?q=hidden`)).toContain(name);
    expect(await names(USER, `/${path}?document=secret-book`)).toEqual([name].concat(path === "species" ? ["Hidden Elf"] : []).sort());
    const detail = await getAs(USER, `/${path}/${id}`);
    expect(detail.status).toBe(200);
    expect(((await detail.json()) as { document: { key: string } }).document.key).toBe("secret-book");
  });

  it("counts private rows in totals and filters", async () => {
    const body = (await (await getAs(USER, "/spells")).json()) as { total: number };
    expect(body.total).toBe(7); // 6 public + 1 private
    expect(await names(USER, "/spells?level=1&class=cleric")).not.toContain("Hidden Fire Spell");
    expect(await names(USER, "/spells?level=1")).toContain("Hidden Fire Spell");
    expect(await names(USER, "/monsters?q=hidden")).toEqual(["Hidden Beast"]);
  });

  it("sees private children of a public parent", async () => {
    const species = (await (await getAs(USER, "/species/srd_elf")).json()) as { subspecies: { name: string }[] };
    expect(species.subspecies.map((s) => s.name)).toContain("Hidden Elf");
    const klass = (await (await getAs(USER, "/classes/srd_wizard")).json()) as { subclasses: { name: string }[] };
    expect(klass.subclasses.map((s) => s.name)).toContain("Hidden Subclass");
  });

  it("lists the private document with its display name and no licence", async () => {
    const body = DocumentListResponse.parse(await (await getAs(USER, "/documents")).json());
    const doc = body.items.find((d) => d.key === "secret-book");
    expect(doc).toMatchObject({ displayName: "Secret Book", visibility: "private", origin: "private" });
    expect(doc?.counts.spells).toBe(1);
    expect(body.items.some((d) => d.key === "srd-2014")).toBe(true);
  });

  it("does not break the licence listing, and shows no empty licence for private documents", async () => {
    const body = LicenseListResponse.parse(await (await getAs(USER, "/licenses")).json());
    expect(body.items.every((l) => l.text.length > 0 && l.name.length > 0)).toBe(true);
  });
});

describe("the core rules filter", () => {
  // The owner of both private books used below.
  beforeEach(async () => {
    await own(USER.email, "secret-book", "phb-2014");
  });

  // A private "phb-2014" document with one invented spell, standing in for an owner's book.
  beforeEach(async () => {
    const doc = { ...secret, key: "phb-2014", name: "Test PHB", displayName: "Test PHB" };
    const spellRow = { ...SEED.spells[0], id: "phb_core-spell", name: "Core Book Spell", documentKey: "phb-2014" };
    await env.DB.batch([
      env.DB.prepare("INSERT INTO documents (key, origin, visibility, name, display_name, game_system, data) VALUES (?, 'private', 'private', ?, ?, ?, ?)").bind(
        doc.key, doc.name, doc.displayName, doc.gameSystem, JSON.stringify(doc),
      ),
      env.DB.prepare("INSERT INTO spells (id, document_key, name, name_search, level, school, classes, concentration, ritual, casting_time, range_text, data) VALUES (?, ?, ?, ?, 1, 'evocation', '', 0, 0, 'action', '60 feet', ?)").bind(
        spellRow.id, spellRow.documentKey, spellRow.name, foldName(spellRow.name), JSON.stringify(spellRow),
      ),
    ]);
  });

  it("gives a signed-in user SRD and book rows, but no third-party or non-core private rows", async () => {
    const got = await names(USER, "/spells?core=true");
    expect(got).toContain("Fireball");
    expect(got).toContain("Core Book Spell");
    expect(got).not.toContain("Dark Flame");
    expect(got).not.toContain("Hidden Fire Spell");
    expect(await names(USER, "/spells")).toContain("Dark Flame");
  });

  it.each(DENIED)("gives %s no private rows", async (_label, caller) => {
    const got = await names(caller, "/spells?core=true");
    expect(got).toContain("Fireball");
    expect(got).not.toContain("Core Book Spell");
    expect(got).not.toContain("Dark Flame");
    expect(await names(caller, "/spells?core=true&document=phb-2014")).toEqual([]);
  });

  it("ANDs core with document", async () => {
    expect(await names(USER, "/spells?core=true&document=tob")).toEqual([]);
    expect(await names(USER, "/spells?core=true&document=phb-2014")).toEqual(["Core Book Spell"]);
  });

  it("treats core=false as no filter, and rejects other values", async () => {
    expect(await names(USER, "/spells?core=false")).toContain("Dark Flame");
    expect((await getAs(USER, "/spells?core=maybe")).status).toBe(400);
  });

  it.each(TABLES)("accepts core on /$path without exposing private rows to an anonymous caller", async ({ path, name }) => {
    expect(await names(NO_IDENTITY, `/${path}?core=true`)).not.toContain(name);
    expect(await names(USER, `/${path}?core=true`)).not.toContain(name);
  });
});

describe("caching", () => {
  it.each(["/spells", "/spells/secret_hidden-spell", "/spells/nope", "/documents", "/licenses"])("%s is private, no-store", async (path) => {
    for (const caller of [USER, NO_IDENTITY]) {
      const res = await getAs(caller, path);
      expect(res.headers.get("cache-control")).toBe("private, no-store");
    }
  });
});

describe.each(DENIED)("%s", (_label, caller) => {
  it("counts only public rows per document", async () => {
    const docs = DocumentListResponse.parse(await (await getAs(caller, "/documents")).json());
    const publicSpells = ((await (await getAs(caller, "/spells")).json()) as { total: number }).total;
    expect(docs.items.reduce((n, d) => n + d.counts.spells, 0)).toBe(publicSpells);
    expect(publicSpells).toBe(6);
  });

  it.each(TABLES)("never sees private $path (list, search, filter, detail)", async ({ path, name, id }) => {
    expect(await names(caller, `/${path}`)).not.toContain(name);
    expect(await names(caller, `/${path}?q=hidden`)).toEqual([]);
    expect(await names(caller, `/${path}?document=secret-book`)).toEqual([]);
    expect((await getAs(caller, `/${path}/${id}`)).status).toBe(404);
  });

  it("gets public totals only, and public behaviour is unchanged", async () => {
    const body = (await (await getAs(caller, "/spells")).json()) as { total: number };
    expect(body.total).toBe(6);
    expect(await names(caller, "/spells?level=0")).toEqual(["Fire Bolt"]);
  });

  it("gets no private children", async () => {
    const species = (await (await getAs(caller, "/species/srd_elf")).json()) as { subspecies: { name: string }[] };
    expect(species.subspecies.map((s) => s.name)).not.toContain("Hidden Elf");
    const klass = (await (await getAs(caller, "/classes/srd_wizard")).json()) as { subclasses: { name: string }[] };
    expect(klass.subclasses.map((s) => s.name)).not.toContain("Hidden Subclass");
    expect((await getAs(caller, "/species/secret_hidden-elf")).status).toBe(404);
  });

  it("does not list the private document, and its text is in no response body", async () => {
    const docs = DocumentListResponse.parse(await (await getAs(caller, "/documents")).json());
    expect(docs.items.some((d) => d.key === "secret-book")).toBe(false);
    const paths = [
      ...TABLES.flatMap((t) => [`/${t.path}`, `/${t.path}?q=hidden`, `/${t.path}?document=secret-book`, `/${t.path}/${t.id}`]),
      "/documents",
      "/licenses",
      "/species/srd_elf",
      "/classes/srd_wizard",
      "/conditions",
    ];
    for (const p of paths) {
      const text = await (await getAs(caller, p)).text();
      for (const marker of PRIVATE_MARKERS) expect(text, `${p} leaked ${marker}`).not.toContain(marker);
    }
  });
});

describe("through the real Worker and Access middleware", () => {
  it("serves private records to a validly signed-in owner, and nothing without a token", async () => {
    await own("player@example.com", "secret-book");
    const { exports } = await import("cloudflare:workers");
    const { authedFetch } = await import("./auth.js");
    expect((await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell")).status).toBe(200);
    expect((await exports.default.fetch(new Request("https://example.com/api/rules/spells/secret_hidden-spell"))).status).toBe(401);
  });

  it("gives a validly signed-in user who owns no book a 404 for a private record", async () => {
    const { authedFetch, signToken } = await import("./auth.js");
    const res = await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: "stranger@example.com" }));
    expect(res.status).toBe(404);
  });

  it("matches a tick to the Access email whatever its case", async () => {
    await own("gary@x.com", "secret-book");
    const { authedFetch, signToken } = await import("./auth.js");
    const res = await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: "Gary@X.com" }));
    expect(res.status).toBe(200);
  });

  it("rejects a service-token style JWT (no email) before any rules route runs", async () => {
    const { authedFetch, signToken } = await import("./auth.js");
    const res = await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: null }));
    expect(res.status).toBe(401);
  });
});

describe("an owner of one private book but not another", () => {
  const OTHER_SPELL = "other_spell";
  beforeEach(async () => {
    await addOtherBook();
    await own(USER.email, "secret-book");
  });

  it("sees the owned book in list, search, filter and detail, and not the other in any of them", async () => {
    expect(await names(USER, "/spells")).toContain("Hidden Fire Spell");
    expect(await names(USER, "/spells")).not.toContain("Other Book Spell");
    expect(await names(USER, "/spells?q=other")).toEqual([]);
    expect(await names(USER, "/spells?document=other-book")).toEqual([]);
    expect((await getAs(USER, `/spells/${OTHER_SPELL}`)).status).toBe(404);
    expect((await getAs(USER, "/spells/secret_hidden-spell")).status).toBe(200);
    expect(((await (await getAs(USER, "/spells")).json()) as { total: number }).total).toBe(7);
  });

  it("lists and counts only the owned book's document", async () => {
    const docs = DocumentListResponse.parse(await (await getAs(USER, "/documents")).json());
    expect(docs.items.map((d) => d.key)).toContain("secret-book");
    expect(docs.items.map((d) => d.key)).not.toContain("other-book");
    expect(JSON.stringify(await (await getAs(USER, "/licenses")).json())).not.toContain("Other Book");
  });

  it("sees the other book once it is ticked, and not before", async () => {
    await own(USER.email, "other-book");
    expect(await names(USER, "/spells")).toContain("Other Book Spell");
    expect((await getAs(USER, `/spells/${OTHER_SPELL}`)).status).toBe(200);
  });

  it("gives a non-owner of both neither", async () => {
    for (const p of ["/spells", "/spells?q=book", "/spells?document=other-book", "/spells?document=secret-book"]) {
      const got = await names(OTHER_USER, p);
      expect(got).not.toContain("Other Book Spell");
      expect(got).not.toContain("Hidden Fire Spell");
    }
    expect((await getAs(OTHER_USER, `/spells/${OTHER_SPELL}`)).status).toBe(404);
  });

  it("never lets the document filter reach an unowned book via a quoted or odd value", async () => {
    expect((await getAs(USER, "/spells?document=other-book%27%20OR%201%3D1")).status).toBe(400);
  });
});
