import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
