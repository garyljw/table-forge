import { staleRowStatements } from "@table-forge/core";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { monster, openBundle, runStatements, SEED, seedRules, spell } from "./seed.js";

const ids = async (table: string): Promise<string[]> =>
  ((await env.DB.prepare(`SELECT id FROM ${table} ORDER BY id`).all()).results as { id: string }[]).map((r) => r.id);

beforeEach(async () => {
  await seedRules();
});

describe("Open5e import SQL", () => {
  it("is idempotent", async () => {
    const before = await ids("spells");
    await runStatements(openBundle("run-2"));
    await runStatements(openBundle("run-3"));
    expect(await ids("spells")).toEqual(before);
  });

  it("updates changed rows in place and removes rows that vanished from Open5e", async () => {
    await runStatements(
      openBundle("run-2", {
        spells: SEED.spells.filter((s) => s.documentKey === "srd-2014" && s.id !== "srd_fireball").concat(spell("srd_fire-bolt", "Fire Bolt Renamed", { level: 0 })),
        monsters: SEED.monsters.filter((m) => m.id === "srd_goblin"),
      }),
    );
    const spells = await ids("spells");
    expect(spells).not.toContain("srd_fireball");
    expect(spells).toContain("srd_fire-bolt");
    const renamed = await env.DB.prepare("SELECT name FROM spells WHERE id = 'srd_fire-bolt'").first<{ name: string }>();
    expect(renamed?.name).toBe("Fire Bolt Renamed");
    expect(await ids("monsters")).toEqual(["secret_hidden-beast", "srd_goblin"]);
  });

  it("never touches rows of private documents", async () => {
    await runStatements(openBundle("run-2", { spells: [], monsters: [], classes: [], conditions: [] }));
    expect(await ids("spells")).toEqual(["secret_hidden-spell"]);
    expect(await ids("monsters")).toEqual(["secret_hidden-beast"]);
    expect(await ids("classes")).toEqual(["secret_hidden-subclass"]);
  });

  it("skips an Open5e record whose id belongs to a private row, instead of overwriting it", async () => {
    await runStatements(openBundle("run-2", { spells: [spell("secret_hidden-spell", "Overwritten", { documentKey: "srd-2014" })] }));
    const row = await env.DB.prepare("SELECT name, document_key, import_run FROM spells WHERE id = 'secret_hidden-spell'").first<Record<string, string | null>>();
    expect(row).toEqual({ name: "Hidden Fire Spell", document_key: "secret-book", import_run: null });
  });

  it("skips records for a document that is not an Open5e one", async () => {
    await runStatements(openBundle("run-2", { monsters: [monster("x_intruder", "Intruder", { documentKey: "secret-book" })] }));
    expect(await ids("monsters")).not.toContain("x_intruder");
  });

  it("leaves the previous data in place when a run stops before its deletes", async () => {
    const full = openBundle("run-2", { spells: [spell("srd_only-one", "Only One")] });
    const stale = staleRowStatements("run-2");
    const upserts = full.slice(0, full.length - stale.length);
    expect(full.slice(-stale.length)).toEqual(stale);
    await runStatements(upserts); // the run "crashes" here, so the deletes never happen
    expect(await ids("spells")).toContain("srd_fireball");
    expect(await ids("spells")).toContain("srd_only-one");
  });

  it("puts every delete after every upsert", () => {
    const statements = openBundle("run-2");
    const firstDelete = statements.findIndex((s) => s.startsWith("DELETE"));
    expect(statements.slice(firstDelete).every((s) => s.startsWith("DELETE"))).toBe(true);
    expect(statements.slice(0, firstDelete).every((s) => s.startsWith("INSERT"))).toBe(true);
  });
});
