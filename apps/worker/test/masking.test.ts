import { DocumentListResponse } from "@table-forge/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { getAs, OTHER_USER, SERVICE_TOKEN, USER, type TestCaller } from "./identities.js";
import { addBook, own, seedRules } from "./seed.js";
import { maskingClause } from "../src/rules/db.js";

// Whole-book rule: owning the private book `mm-2014` hides every `srd-2014` monster. All rows are invented.
beforeEach(async () => {
  await seedRules();
  await addBook("mm-2014");
  await addBook("phb-2014");
  await addBook("dmg-2014");
});

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
    expect((await list(USER, "/spells")).total).toBe(6);
  });

  it("applies the masking to the per-document counts", async () => {
    expect((await counts(USER, "srd-2014"))?.monsters).toBe(0);
    expect((await counts(USER, "srd-2014"))?.spells).toBe(5);
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

describe("owners of other books", () => {
  it.each(["phb-2014", "dmg-2014"])("owning %s hides nothing yet", async (key) => {
    await own(USER.email, key);
    expect(await names(USER, "/monsters")).toEqual(expect.arrayContaining(["Goblin", "Owlbear"]));
    expect(await names(USER, "/spells")).toContain("Fireball");
    expect((await counts(USER, "srd-2014"))?.monsters).toBe(3);
  });

  it("a tick for a public document grants nothing and hides nothing", async () => {
    await own(USER.email, "srd-2014", "tob", "mm-2014-not-a-book");
    expect(await names(USER, "/monsters")).toContain("Goblin");
    expect(await names(USER, "/monsters")).not.toContain("mm-2014 Beast");
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

describe("maskingClause", () => {
  it("emits no condition without an email or for a table no book replaces", () => {
    expect(maskingClause({ email: null }, "monsters")).toBeNull();
    expect(maskingClause({ email: "a@example.com" }, "spells")).toBeNull();
  });

  it("binds the SRD key, the email and the book keys", () => {
    const c = maskingClause({ email: "a@example.com" }, "monsters");
    expect(c?.params).toEqual(["srd-2014", "a@example.com", "mm-2014"]);
    expect(c?.sql).not.toContain("mm-2014");
    expect(c?.sql).not.toContain("a@example.com");
  });
});
