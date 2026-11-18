import staging_raw from "../wrangler.staging.jsonc?raw";
import prod_raw from "../wrangler.jsonc?raw";
import { describe, expect, it } from "vitest";

type Db = { binding: string; database_name: string; database_id: string };
type Config = {
  name: string;
  vars: Record<string, string>;
  d1_databases: Db[];
  previews: { vars: Record<string, string>; d1_databases: Db[] } & Record<string, unknown>;
} & Record<string, unknown>;

const PROD_ID = "26bd7e1d-be10-4ce3-9c36-c0dca3c1ade3";
const STAGING_ID = "0d84c04d-f8a1-4d3e-a527-55b8678a2407";

/** Minimal JSONC reader: whole-line `//` comments, plus trailing `// gitleaks:allow` markers. */
function readConfig(text: string): Config {
  return JSON.parse(text.split("\n").filter((l) => !l.trim().startsWith("//")).map((l) => l.replace(/\s*\/\/ gitleaks:allow.*$/, "")).join("\n")) as Config;
}

describe("wrangler configs", () => {
  const prod = readConfig(prod_raw);
  const staging = readConfig(staging_raw);
  const previews = prod.previews;

  it("binds production DB at top level and staging DB in previews, and they differ", () => {
    expect(prod.d1_databases).toHaveLength(1);
    expect(previews.d1_databases).toHaveLength(1);
    expect(prod.d1_databases[0]!.binding).toBe("DB");
    expect(previews.d1_databases[0]!.binding).toBe("DB");
    expect(prod.d1_databases[0]!.database_id).toBe(PROD_ID);
    expect(previews.d1_databases[0]!.database_id).toBe(STAGING_ID);
    expect(previews.d1_databases[0]!.database_id).not.toBe(prod.d1_databases[0]!.database_id);
    expect(previews.d1_databases[0]!.database_name).not.toBe(prod.d1_databases[0]!.database_name);
  });

  it("previews vars match the top-level vars", () => {
    expect(previews.vars).toEqual(prod.vars);
  });

  it("never carries the production database id in any preview binding or the staging migrations config", () => {
    expect(JSON.stringify(previews)).not.toContain(PROD_ID);
    expect(JSON.stringify(previews)).not.toContain(prod.d1_databases[0]!.database_name + '"');
    expect(JSON.stringify(staging)).not.toContain(PROD_ID);
  });

  it("keeps the staging migrations config identical to the previews DB binding", () => {
    expect(staging.d1_databases).toHaveLength(1);
    expect(staging.d1_databases[0]).toMatchObject(previews.d1_databases[0]!);
    expect(staging.vars).toBeUndefined();
    expect(staging.previews).toBeUndefined();
  });

  it("sets valid Access vars and never a dev bypass", () => {
    for (const vars of [prod.vars, previews.vars]) {
      expect(vars.ACCESS_TEAM_DOMAIN).toMatch(/^[a-z0-9-]+\.cloudflareaccess\.com$/);
      expect(vars.ACCESS_AUD).toMatch(/^[0-9a-f]{64}$/);
    }
    for (const c of [prod, staging]) expect(JSON.stringify(c)).not.toContain("ACCESS_DEV_IDENTITY");
  });
});
