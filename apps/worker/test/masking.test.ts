import { DocumentListResponse } from "@table-forge/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { getAs, OTHER_USER, SERVICE_TOKEN, USER, type TestCaller } from "./identities.js";
import { env } from "cloudflare:workers";
import { addOtherBook, klass, own, seedRules, supersede } from "./seed.js";

// Book A ("secret-book") replaces Fireball, Goblin and the School of Evocation; book B ("other-book")
// replaces Fire Bolt. All rows are invented.
beforeEach(async () => {
  await seedRules();
  await addOtherBook();
  await supersede("spells", "secret_hidden-spell", "srd_fireball");
  await supersede("monsters", "secret_hidden-beast", "srd_goblin");
  await supersede("classes", "secret_hidden-subclass", "srd_school-of-evocation");
  await supersede("spells", "other_spell", "srd_fire-bolt");
});

async function list(caller: TestCaller, path: string): Promise<{ items: { id: string; name: string }[]; total: number }> {
  const res = await getAs(caller, path);
  expect(res.status).toBe(200);
  return (await res.json()) as { items: { id: string; name: string }[]; total: number };
}
const names = async (caller: TestCaller, path: string) => (await list(caller, path)).items.map((i) => i.name);
const detail = async (caller: TestCaller, path: string) => (await (await getAs(caller, path)).json()) as { supersededBy?: string };

describe("an owner of book A (not B)", () => {
  beforeEach(async () => {
    await own(USER.email, "secret-book");
  });

  it("no longer sees the SRD records book A replaces, but does see book A's", async () => {
    const spells = await names(USER, "/spells");
    expect(spells).not.toContain("Fireball");
    expect(spells).toContain("Hidden Fire Spell");
    expect(await names(USER, "/spells?q=fireball")).toEqual([]);
    expect(await names(USER, "/monsters")).not.toContain("Goblin");
    expect(await names(USER, "/monsters")).toContain("Hidden Beast");
  });

  it("still sees SRD records replaced only by book B", async () => {
    expect(await names(USER, "/spells")).toContain("Fire Bolt");
    expect(await names(USER, "/spells?level=0")).toEqual(["Fire Bolt"]);
    expect((await detail(USER, "/spells/srd_fire-bolt")).supersededBy).toBeUndefined();
  });

  it("reduces the list total by the masked rows", async () => {
    // 6 public + 1 book A, minus Fireball.
    expect((await list(USER, "/spells")).total).toBe(6);
  });

  it("opening a replaced record still works and points at the replacement", async () => {
    const res = await getAs(USER, "/spells/srd_fireball");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: { name: string }; supersededBy: string }).supersededBy).toBe("secret_hidden-spell");
    expect((await detail(USER, "/monsters/srd_goblin")).supersededBy).toBe("secret_hidden-beast");
  });

  it("hides replaced records from the children of their parent, and keeps the rest", async () => {
    const klass = (await (await getAs(USER, "/classes/srd_wizard")).json()) as { subclasses: { name: string }[] };
    const names = klass.subclasses.map((s) => s.name);
    expect(names).not.toContain("School of Evocation");
    expect(names).toContain("Hidden Subclass");
    expect(names).toContain("Path of Tomes");
  });

  it("applies the masking to the per-document counts", async () => {
    const docs = DocumentListResponse.parse(await (await getAs(USER, "/documents")).json());
    const srd = docs.items.find((d) => d.key === "srd-2014");
    const publicSpells = 4; // Fireball (masked), Fire Bolt, Detect Magic, Cure Wounds, 100% Pure_Fire = 5, minus Fireball
    expect(srd?.counts.spells).toBe(publicSpells);
    expect(srd?.counts.monsters).toBe(2);
    expect(docs.items.find((d) => d.key === "secret-book")?.counts.spells).toBe(1);
  });

  it("owning book B as well masks Fire Bolt too", async () => {
    await own(USER.email, "other-book");
    expect(await names(USER, "/spells")).not.toContain("Fire Bolt");
    expect((await detail(USER, "/spells/srd_fire-bolt")).supersededBy).toBe("other_spell");
  });
});

describe.each([
  ["a signed-in user who owns no book", OTHER_USER],
  ["a caller who is not a user", SERVICE_TOKEN],
] as [string, TestCaller][])("%s", (_label, caller) => {
  it("sees every SRD record, unmasked", async () => {
    const spells = await names(caller, "/spells");
    expect(spells).toContain("Fireball");
    expect(spells).toContain("Fire Bolt");
    expect(await names(caller, "/monsters")).toContain("Goblin");
    expect((await list(caller, "/spells")).total).toBe(6);
  });

  it("gets no supersededBy, so no book id leaks", async () => {
    for (const p of ["/spells/srd_fireball", "/monsters/srd_goblin", "/classes/srd_school-of-evocation", "/spells/srd_fire-bolt"]) {
      const text = await (await getAs(caller, p)).text();
      expect(text).not.toContain("supersededBy");
      expect(text).not.toContain("secret_");
      expect(text).not.toContain("other_spell");
    }
  });

  it("sees the replaced subclass among the children and in the counts", async () => {
    const klass = (await (await getAs(caller, "/classes/srd_wizard")).json()) as { subclasses: { name: string }[] };
    expect(klass.subclasses.map((s) => s.name)).toContain("School of Evocation");
    const docs = DocumentListResponse.parse(await (await getAs(caller, "/documents")).json());
    expect(docs.items.find((d) => d.key === "srd-2014")?.counts.spells).toBe(5);
  });
});

describe("masking edge cases", () => {
  it("an owner of B only is not masked by book A", async () => {
    await own(USER.email, "other-book");
    expect(await names(USER, "/spells")).toContain("Fireball");
    expect(await names(USER, "/spells")).not.toContain("Fire Bolt");
  });

  it("a record that supersedes a record in another table does nothing", async () => {
    await own(USER.email, "secret-book");
    await supersede("spells", "secret_hidden-spell", "srd_wizard");
    expect(await names(USER, "/classes?kind=class")).toContain("Wizard");
  });
});

describe("self-supersession", () => {
  it("a record that names itself neither masks itself nor redirects to itself", async () => {
    await supersede("spells", "srd_fireball", "srd_fireball");
    for (const caller of [USER, OTHER_USER]) {
      expect(await names(caller, "/spells")).toContain("Fireball");
      expect((await detail(caller, "/spells/srd_fireball")).supersededBy).toBeUndefined();
    }
  });
});

describe("children of a record that supersedes its parent", () => {
  beforeEach(async () => {
    // Book A's own Wizard replaces the SRD Wizard.
    const wizard = klass("secret_wizard", "Book Wizard", { documentKey: "secret-book" });
    await env.DB.prepare("INSERT INTO classes (id, document_key, name, name_search, parent_id, parent_name, data) VALUES (?, 'secret-book', 'Book Wizard', 'book wizard', NULL, NULL, ?)")
      .bind(wizard.id, JSON.stringify(wizard))
      .run();
    await supersede("classes", "secret_wizard", "srd_wizard");
    // Undo the outer setup's masking of the SRD subclass, so it shows as a plain child.
    await env.DB.prepare("UPDATE classes SET supersedes_id = NULL WHERE id = 'secret_hidden-subclass'").run();
  });
  const subs = async (caller: TestCaller, id: string) =>
    ((await (await getAs(caller, `/classes/${id}`)).json()) as { subclasses: { name: string }[] }).subclasses.map((s) => s.name);

  it("shows the replaced Wizard's subclasses under the book Wizard for its owner", async () => {
    await own(USER.email, "secret-book");
    const got = await subs(USER, "secret_wizard");
    expect(got).toEqual(expect.arrayContaining(["School of Evocation", "Path of Tomes", "Hidden Subclass"]));
  });

  it("still applies masking to those children", async () => {
    await own(USER.email, "secret-book");
    await supersede("classes", "secret_hidden-subclass", "srd_school-of-evocation");
    const got = await subs(USER, "secret_wizard");
    expect(got).not.toContain("School of Evocation");
    expect(got).toContain("Hidden Subclass");
  });

  it("does not include them when the superseding parent is not readable", async () => {
    expect((await getAs(OTHER_USER, "/classes/secret_wizard")).status).toBe(404);
    const { selectChildren } = await import("../src/rules/db.js");
    const rows = await selectChildren<{ name: string }>(env.DB, { email: OTHER_USER.email }, "classes", "t.name", "secret_wizard");
    expect(rows).toEqual([]);
  });

  it("leaves the SRD Wizard unchanged for a non-owner", async () => {
    const got = await subs(OTHER_USER, "srd_wizard");
    expect(got).toEqual(expect.arrayContaining(["School of Evocation", "Path of Tomes"]));
    expect(got).not.toContain("Hidden Subclass");
  });

  it("works for species and rules chapters too", async () => {
    await own(USER.email, "secret-book");
    const { selectChildren } = await import("../src/rules/db.js");
    await env.DB.prepare("INSERT INTO species (id, document_key, name, name_search, parent_id, parent_name, data) VALUES ('secret_book-elf', 'secret-book', 'Book Elf', 'book elf', NULL, NULL, '{}')").run();
    await supersede("species", "secret_book-elf", "srd_elf");
    const kids = await selectChildren<{ name: string }>(env.DB, { email: USER.email }, "species", "t.name", "secret_book-elf");
    expect(kids.map((k) => k.name)).toContain("High Elf");
    await env.DB.prepare("INSERT INTO rule_chapters (id, document_key, name, name_search, sort_index, data) VALUES ('secret_book-chapter', 'secret-book', 'Book Chapter', 'book chapter', 1, '{}')").run();
    await supersede("rule_chapters", "secret_book-chapter", "secret_hidden-chapter");
    const rules = await selectChildren<{ name: string }>(env.DB, { email: USER.email }, "rules", "t.name", "secret_book-chapter");
    expect(rules.map((r) => r.name)).toContain("Hidden Rule");
  });
});
