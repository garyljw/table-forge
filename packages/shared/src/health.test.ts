import { describe, expect, it } from "vitest";
import { HealthResponse } from "./health.js";

describe("HealthResponse", () => {
  it("accepts a valid payload", () => {
    expect(HealthResponse.safeParse({ ok: true, service: "table-forge", version: "0.0.0" }).success).toBe(true);
  });

  it("rejects a wrong service name", () => {
    expect(HealthResponse.safeParse({ ok: true, service: "other", version: "0.0.0" }).success).toBe(false);
  });
});
