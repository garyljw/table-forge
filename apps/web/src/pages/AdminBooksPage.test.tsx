import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Router, useLocation } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SRD_DOCUMENT } from "../test-fixtures.js";
import { SpellDetailPage } from "./DetailPages.js";
import { AdminBooksPage } from "./AdminBooksPage.js";

const OWNERS = {
  books: [
    { key: "mm-2014", displayName: "Monster Manual" },
    { key: "phb-2014", displayName: "Player's Handbook" },
  ],
  users: [{ email: "ann@example.com" }, { email: "bob@example.com" }],
  owners: [{ email: "ann@example.com", documentKey: "phb-2014" }],
};

const calls: { method: string; url: string; body: unknown }[] = [];
let putStatus = 200;

beforeEach(() => {
  calls.length = 0;
  putStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url: String(input), body });
      if (method === "PUT") return putStatus === 200 ? new Response(JSON.stringify(body)) : new Response("{}", { status: putStatus });
      return new Response(JSON.stringify(OWNERS));
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(path: string, ui: React.ReactNode) {
  const loc = memoryLocation({ path, record: true });
  render(
    <Router hook={loc.hook} searchHook={loc.searchHook}>
      {ui}
    </Router>,
  );
  return loc;
}

describe("admin books page", () => {
  it("shows people as rows and private books as columns, with current ticks", async () => {
    renderAt("/admin/books", <AdminBooksPage />);
    await screen.findByText("ann@example.com");
    expect(screen.getByRole("columnheader", { name: "Monster Manual" })).toBeTruthy();
    expect((screen.getByLabelText("ann@example.com owns Player's Handbook") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("ann@example.com owns Monster Manual") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("bob@example.com owns Player's Handbook") as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/verified in person/)).toBeTruthy();
  });

  it("ticking a box sends a PUT and keeps it ticked", async () => {
    renderAt("/admin/books", <AdminBooksPage />);
    const box = (await screen.findByLabelText("bob@example.com owns Monster Manual")) as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")).toMatchObject({ url: "/api/admin/book-owners", body: { email: "bob@example.com", documentKey: "mm-2014", owns: true } });
    await waitFor(() => expect((screen.getByLabelText("bob@example.com owns Monster Manual") as HTMLInputElement).checked).toBe(true));
  });

  it("unticking sends owns: false", async () => {
    renderAt("/admin/books", <AdminBooksPage />);
    fireEvent.click(await screen.findByLabelText("ann@example.com owns Player's Handbook"));
    await waitFor(() => expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ email: "ann@example.com", documentKey: "phb-2014", owns: false }));
  });

  it("shows an error and leaves the box as it was when the save fails", async () => {
    putStatus = 403;
    renderAt("/admin/books", <AdminBooksPage />);
    fireEvent.click(await screen.findByLabelText("bob@example.com owns Monster Manual"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/not allowed/);
    expect((screen.getByLabelText("bob@example.com owns Monster Manual") as HTMLInputElement).checked).toBe(false);
  });

  it("adds a person by email as a new row, and refuses a bad address", async () => {
    renderAt("/admin/books", <AdminBooksPage />);
    const input = await screen.findByLabelText("Add a person by email");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("alert").textContent).toMatch(/does not look like an email/);
    fireEvent.change(input, { target: { value: "  New@Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const row = (await screen.findByText("new@example.com")).closest("tr") as HTMLElement;
    expect(within(row).getAllByRole("checkbox")).toHaveLength(2);
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
  });

  it("shows an error when the server refuses the list (not an admin)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    renderAt("/admin/books", <AdminBooksPage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/403/);
  });
});

describe("a detail page for a record an owned book replaces", () => {
  const spellBody = (id: string, supersededBy?: string) => ({
    data: { id, documentKey: "srd-2014", dmOnly: false, name: id, level: 3, school: "evocation", classes: [], concentration: false, ritual: false, castingTime: "action", range: "150 feet", description: "x", higherLevel: null, duration: "Instantaneous", reactionCondition: null, components: { verbal: true, somatic: true, material: false, materialDescription: null, materialCostGp: null, materialConsumed: false }, attackRoll: false, savingThrow: null, damageRoll: null, damageTypes: [], area: null, targetType: null, targetCount: null },
    document: SRD_DOCUMENT,
    ...(supersededBy ? { supersededBy } : {}),
  });

  it("never shows the superseded record while redirecting, even under StrictMode, and follows once", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const id = String(input).split("/").pop() as string;
        return new Response(JSON.stringify(spellBody(id, id === "old_one" ? "new_one" : undefined)));
      }),
    );
    let sawOld = false;
    const watch = new MutationObserver(() => {
      if (document.body.textContent?.includes("old_one")) sawOld = true;
    });
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
    const loc = memoryLocation({ path: "/spells/old_one", record: true });
    function Page() {
      const [l] = useLocation();
      return <SpellDetailPage id={l.split("/").pop() as string} />;
    }
    render(
      <StrictMode>
        <Router hook={loc.hook} searchHook={loc.searchHook}>
          <Page />
        </Router>
      </StrictMode>,
    );
    await screen.findByText("new_one");
    watch.disconnect();
    expect(sawOld).toBe(false);
    expect(loc.history).toEqual(["/spells/new_one"]);
  });

  it("does not redirect when a record names itself", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(spellBody("self_one", "self_one")))));
    const loc = renderAt("/spells/self_one", <SpellDetailPage id="self_one" />);
    await screen.findByText("self_one");
    expect(loc.history).toEqual(["/spells/self_one"]);
  });

  it("follows one hop only, so a chain cannot loop", async () => {
    const chain: Record<string, string> = { hop_a: "hop_b", hop_b: "hop_c", hop_c: "hop_a" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const id = String(input).split("/").pop() as string;
        return new Response(JSON.stringify(spellBody(id, chain[id])));
      }),
    );
    function Page() {
      const [loc] = useLocation();
      return <SpellDetailPage id={loc.split("/").pop() as string} />;
    }
    const loc = renderAt("/spells/hop_a", <Page />);
    await waitFor(() => expect(loc.history.at(-1)).toBe("/spells/hop_b"));
    await screen.findByText("hop_b");
    await new Promise((r) => setTimeout(r, 50));
    expect(loc.history).toEqual(["/spells/hop_b"]);
  });

  it("redirects to the replacement, replacing the history entry", async () => {
    const spell = { id: "srd_fireball", documentKey: "srd-2014", dmOnly: false, name: "Fireball" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: { ...spell, level: 3, school: "evocation", classes: [], concentration: false, ritual: false, castingTime: "action", range: "150 feet", description: "x", higherLevel: null, duration: "Instantaneous", reactionCondition: null, components: { verbal: true, somatic: true, material: false, materialDescription: null, materialCostGp: null, materialConsumed: false }, attackRoll: false, savingThrow: null, damageRoll: null, damageTypes: [], area: null, targetType: null, targetCount: null }, document: SRD_DOCUMENT, supersededBy: "phb_fireball" }))),
    );
    const loc = renderAt("/spells/srd_fireball", <SpellDetailPage id="srd_fireball" />);
    await waitFor(() => expect(loc.history.at(-1)).toBe("/spells/phb_fireball"));
    // Replaced, not pushed: the old URL is not left behind to go back to.
    expect(loc.history).toEqual(["/spells/phb_fireball"]);
  });
});
