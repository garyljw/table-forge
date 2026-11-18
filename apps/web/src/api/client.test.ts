import { SpellListResponse } from "@table-forge/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, apiGet, queryString } from "./client.js";

afterEach(() => vi.unstubAllGlobals());

const reply = (body: unknown, status = 200) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe("queryString", () => {
  it("leaves out empty values", () => {
    expect(queryString({ q: "fire", level: undefined, school: "", page: 2 })).toBe("?q=fire&page=2");
    expect(queryString({})).toBe("");
  });
});

describe("apiGet", () => {
  it("returns data that matches the schema", async () => {
    reply({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    await expect(apiGet("/api/rules/spells", SpellListResponse)).resolves.toMatchObject({ total: 0 });
  });

  it("rejects a malformed response", async () => {
    reply({ items: [{ id: "srd_x", name: "No other fields" }], page: 1 });
    await expect(apiGet("/api/rules/spells", SpellListResponse)).rejects.toThrow(ApiRequestError);
    await expect(apiGet("/api/rules/spells", SpellListResponse)).rejects.toThrow(/unexpected shape/);
  });

  it("rejects a body that is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>", { status: 200 })));
    await expect(apiGet("/api/rules/spells", SpellListResponse)).rejects.toThrow(/not JSON/);
  });

  it("turns HTTP errors and network failures into ApiRequestError", async () => {
    reply({ error: "nope" }, 404);
    await expect(apiGet("/x", SpellListResponse)).rejects.toMatchObject({ status: 404 });
    reply({ error: "boom" }, 500);
    await expect(apiGet("/x", SpellListResponse)).rejects.toMatchObject({ status: 500 });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await expect(apiGet("/x", SpellListResponse)).rejects.toThrow(/Could not reach/);
  });

  it("sends the query string", async () => {
    reply({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    await apiGet("/api/rules/spells", SpellListResponse, { class: "wizard", level: "3" });
    const fetchMock = vi.mocked(fetch);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/rules/spells?class=wizard&level=3");
  });
});
