import { staleRowStatements } from "@table-forge/core";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { magicItem, monster, openBundle, rule, runStatements, SEED, seedRules, species, spell } from "./seed.js";

const ids = async (table: string): Promise<string[]> =>
  ((await env.DB.prepare(`SELECT id FROM ${table} ORDER BY id`).all()).results as { id: string }[]).map((r) => r.id);

beforeEach(async () => {
  await seedRules();
});

describe("Open5e import SQL", () => {
  it("leaves the unused supersedes_id column NULL", async () => {
    await runStatements(openBundle("run-2"));
    const n = (await env.DB.prepare("SELECT COUNT(*) AS n FROM spells WHERE supersedes_id IS NOT NULL").first<{ n: number }>())?.n;
    expect(n).toBe(0);
  });

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
    await runStatements(openBundle("run-2", { spells: [], monsters: [], classes: [], conditions: [], species: [], backgrounds: [], feats: [], weapons: [], armor: [], magicItems: [], ruleChapters: [], rules: [], items: [], itemSets: [], referenceEntries: [] }));
    expect(await ids("spells")).toEqual(["secret_hidden-spell"]);
    expect(await ids("monsters")).toEqual(["secret_hidden-beast"]);
    expect(await ids("classes")).toEqual(["secret_hidden-subclass"]);
    expect(await ids("species")).toEqual(["secret_hidden-elf", "secret_hidden-species"]);
    expect(await ids("backgrounds")).toEqual(["secret_hidden-background"]);
    expect(await ids("feats")).toEqual(["secret_hidden-feat"]);
    expect(await ids("weapons")).toEqual(["secret_hidden-blade"]);
    expect(await ids("armor")).toEqual(["secret_hidden-plate"]);
    expect(await ids("magic_items")).toEqual(["secret_hidden-idol"]);
    expect(await ids("rule_chapters")).toEqual(["secret_hidden-chapter"]);
    expect(await ids("rules")).toEqual(["secret_hidden-rule"]);
    expect(await ids("items")).toEqual(["secret_hidden-trinket"]);
    expect(await ids("item_sets")).toEqual(["secret_hidden-pack"]);
    expect(await ids("reference_entries")).toEqual(["secret-book_damage-type_hidden"]);
  });

  it("is idempotent for the character option tables, and removes vanished rows", async () => {
    const before = { species: await ids("species"), weapons: await ids("weapons"), armor: await ids("armor") };
    await runStatements(openBundle("run-2"));
    await runStatements(openBundle("run-3"));
    expect({ species: await ids("species"), weapons: await ids("weapons"), armor: await ids("armor") }).toEqual(before);
    await runStatements(openBundle("run-4", { species: SEED.species.filter((x) => x.id === "srd_elf"), armor: [] }));
    expect(await ids("species")).toEqual(["secret_hidden-elf", "secret_hidden-species", "srd_elf"]);
    expect(await ids("armor")).toEqual(["secret_hidden-plate"]);
  });

  it("is idempotent for magic items, removes vanished rows and leaves private ones", async () => {
    const before = await ids("magic_items");
    await runStatements(openBundle("run-2"));
    expect(await ids("magic_items")).toEqual(before);
    await runStatements(openBundle("run-3", { magicItems: SEED.magicItems.filter((x) => x.id === "srd_test-ring") }));
    expect(await ids("magic_items")).toEqual(["secret_hidden-idol", "srd_test-ring"]);
    await runStatements(openBundle("run-4", { magicItems: [magicItem("secret_hidden-idol", "Overwritten", { documentKey: "srd-2014" })] }));
    expect((await env.DB.prepare("SELECT name FROM magic_items WHERE id = 'secret_hidden-idol'").first<{ name: string }>())?.name).toBe("Hidden Idol");
  });

  it("is idempotent for rules text, equipment and reference entries, and removes vanished rows", async () => {
    const tables = ["rule_chapters", "rules", "items", "item_sets", "reference_entries"];
    const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await ids(t)])));
    const before = await snapshot();
    await runStatements(openBundle("run-2"));
    await runStatements(openBundle("run-3"));
    expect(await snapshot()).toEqual(before);
    await runStatements(
      openBundle("run-4", {
        ruleChapters: SEED.ruleChapters.filter((x) => x.id === "srd_test-combat"),
        rules: SEED.rules.filter((x) => x.id === "srd_test-combat_attack"),
        items: [],
        itemSets: SEED.itemSets.filter((x) => x.id === "test-pack"),
        referenceEntries: SEED.referenceEntries.filter((x) => x.kind === "size" && x.documentKey === "srd-2014"),
      }),
    );
    expect(await ids("rule_chapters")).toEqual(["secret_hidden-chapter", "srd_test-combat"]);
    expect(await ids("rules")).toEqual(["secret_hidden-rule", "srd_test-combat_attack"]);
    expect(await ids("items")).toEqual(["secret_hidden-trinket"]);
    expect(await ids("item_sets")).toEqual(["secret_hidden-pack", "test-pack"]);
    expect(await ids("reference_entries")).toEqual(["secret-book_damage-type_hidden", "srd-2014_size_large", "srd-2014_size_tiny"]);
  });

  it("skips a rule whose id belongs to a private row, instead of overwriting it", async () => {
    await runStatements(openBundle("run-2", { rules: [rule("secret_hidden-rule", "Overwritten")] }));
    const row = await env.DB.prepare("SELECT name, document_key, import_run FROM rules WHERE id = 'secret_hidden-rule'").first<Record<string, string | null>>();
    expect(row).toEqual({ name: "Hidden Rule", document_key: "secret-book", import_run: null });
  });

  it("skips a species whose id belongs to a private row", async () => {
    await runStatements(openBundle("run-2", { species: [species("secret_hidden-species", "Overwritten", { documentKey: "srd-2014" })] }));
    const row = await env.DB.prepare("SELECT name, document_key, import_run FROM species WHERE id = 'secret_hidden-species'").first<Record<string, string | null>>();
    expect(row).toEqual({ name: "Hidden Species", document_key: "secret-book", import_run: null });
  });

  it("skips an Open5e record whose id belongs to a private row, instead of overwriting it", async () => {
    await runStatements(openBundle("run-2", { spells: [spell("secret_hidden-spell", "Overwritten", { documentKey: "srd-2014" })] }));
    const row = await env.DB.prepare("SELECT name, document_key, import_run FROM spells WHERE id = 'secret_hidden-spell'").first<Record<string, string | null>>();
    expect(row).toEqual({ name: "Hidden Fire Spell", document_key: "secret-book", import_run: null });
  });

  it("cannot overwrite or flip a private document that shares its key", async () => {
    const hijack = { ...SEED.documents[0]!, key: "secret-book", displayName: "Hijacked", origin: "open5e" as const, visibility: "public" as const };
    await runStatements(openBundle("run-2", { documents: [...SEED.documents.filter((d) => d.origin === "open5e"), hijack] }));
    const row = await env.DB.prepare("SELECT origin, visibility, display_name FROM documents WHERE key = 'secret-book'").first();
    expect(row).toEqual({ origin: "private", visibility: "private", display_name: "Secret Book" });
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
