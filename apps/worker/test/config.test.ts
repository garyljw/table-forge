import preview_raw from "../wrangler.preview.jsonc?raw";
import prod_raw from "../wrangler.jsonc?raw";
import { describe, expect, it } from "vitest";

type Db = { binding: string; database_name: string; database_id: string; migrations_dir: string };
type Config = { name: string; vars: Record<string, string>; d1_databases: Db[] } & Record<string, unknown>;

/** Minimal JSONC reader: whole-line `//` comments, plus trailing `// gitleaks:allow` markers. */
function readConfig(text: string): Config {
  return JSON.parse(text.split("\n").filter((l) => !l.trim().startsWith("//")).map((l) => l.replace(/\s*\/\/ gitleaks:allow.*$/, "")).join("\n")) as Config;
}

describe("wrangler configs", () => {
  const prod = readConfig(prod_raw);
  const preview = readConfig(preview_raw);

  it("preview differs from production only in the D1 database", () => {
    const strip = (c: Config) => ({ ...c, d1_databases: c.d1_databases.map((d) => ({ binding: d.binding, migrations_dir: d.migrations_dir })) });
    expect(strip(preview)).toEqual(strip(prod));
    expect(preview.name).toBe(prod.name);
  });

  it("binds DB to separate production and staging databases", () => {
    expect(prod.d1_databases[0]!.binding).toBe("DB");
    expect(preview.d1_databases[0]!.binding).toBe("DB");
    expect(prod.d1_databases[0]!.database_id).toBe("26bd7e1d-be10-4ce3-9c36-c0dca3c1ade3");
    expect(preview.d1_databases[0]!.database_id).toBe("0d84c04d-f8a1-4d3e-a527-55b8678a2407");
    expect(preview.d1_databases[0]!.database_id).not.toBe(prod.d1_databases[0]!.database_id);
  });

  it("sets non-empty Access vars and never a dev bypass", () => {
    for (const c of [prod, preview]) {
      expect(c.vars.ACCESS_TEAM_DOMAIN).toMatch(/^[a-z0-9-]+\.cloudflareaccess\.com$/);
      expect(c.vars.ACCESS_AUD).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(c)).not.toContain("ACCESS_DEV_IDENTITY");
    }
  });
});
