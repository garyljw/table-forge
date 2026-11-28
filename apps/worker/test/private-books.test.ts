import { DocumentListResponse, LicenseListResponse } from "@table-forge/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { DISPLAY, EMAIL_BUT_NOT_USER, getAs, NO_IDENTITY, SERVICE_TOKEN, USER, type TestCaller } from "./identities.js";
import { seedRules } from "./seed.js";

// The seed's private document ("secret-book") holds INVENTED rows, never real book text.
const PRIVATE_MARKERS = ["Hidden", "secret_", "secret-book", "Secret Book", "PRIVATE"];

const DENIED: [string, TestCaller][] = [
  ["no identity", NO_IDENTITY],
  ["a service token", SERVICE_TOKEN],
  ["a Display identity", DISPLAY],
  ["an email on a non-user kind", EMAIL_BUT_NOT_USER],
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

describe("a verified Access user", () => {
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
  it("serves private records to a validly signed-in user, and nothing without a token", async () => {
    const { exports } = await import("cloudflare:workers");
    const { authedFetch } = await import("./auth.js");
    expect((await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell")).status).toBe(200);
    expect((await exports.default.fetch(new Request("https://example.com/api/rules/spells/secret_hidden-spell"))).status).toBe(401);
  });

  it("rejects a service-token style JWT (no email) before any rules route runs", async () => {
    const { authedFetch, signToken } = await import("./auth.js");
    const res = await authedFetch("https://example.com/api/rules/spells/secret_hidden-spell", {}, await signToken({ email: null }));
    expect(res.status).toBe(401);
  });
});
