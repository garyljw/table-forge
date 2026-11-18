import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { goblin } from "../test-fixtures.js";
import { StatBlock } from "./StatBlock.js";

afterEach(cleanup);

describe("StatBlock", () => {
  it("shows ability modifiers worked out by the core function", () => {
    render(<StatBlock monster={goblin} />);
    const table = screen.getByRole("table", { name: "Ability scores" });
    const text = (name: string) => within(table).getByText(name).closest("[role=row]")?.textContent;
    expect(text("STR")).toContain("8 (-1)");
    expect(text("DEX")).toContain("14 (+2)");
    expect(text("CON")).toContain("10 (+0)");
  });

  it("shows CR as a fraction with XP and proficiency bonus filled in when the data omits them", () => {
    render(<StatBlock monster={goblin} />);
    expect(screen.getByText(/Challenge/).closest("p")?.textContent).toContain("1/4 (50 XP)");
    expect(screen.getByText(/Proficiency Bonus/).closest("p")?.textContent).toContain("+2");
  });

  it("shows speeds, senses, skills and actions", () => {
    render(<StatBlock monster={goblin} />);
    expect(screen.getByText(/30 ft\./)).toBeTruthy();
    expect(screen.getByText(/darkvision 60 ft\., passive Perception 9/)).toBeTruthy();
    expect(screen.getByText(/Stealth \+6/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Actions" })).toBeTruthy();
  });

  it("shows legendary actions with their cost and recharge notes", () => {
    const dragon = {
      ...goblin,
      name: "Ancient Red Dragon",
      challengeRating: 24,
      experiencePoints: 62000,
      proficiencyBonus: 7,
      abilityScores: { ...goblin.abilityScores, strength: 30 },
      actions: [{ name: "Fire Breath", description: "Exhales fire.", usage: { kind: "recharge" as const, value: 5 }, legendaryCost: null }],
      legendaryActions: [{ name: "Wing Attack", description: "Beats wings.", usage: null, legendaryCost: 2 }],
    };
    render(<StatBlock monster={dragon} />);
    expect(screen.getByRole("heading", { name: "Legendary Actions" })).toBeTruthy();
    expect(screen.getByText(/Wing Attack \(Costs 2 Actions\)/)).toBeTruthy();
    expect(screen.getByText(/Fire Breath \(Recharge 5–6\)/)).toBeTruthy();
    expect(screen.getByText(/24 \(62,000 XP\)/)).toBeTruthy();
    expect(screen.getByText("STR").closest("[role=row]")?.textContent).toContain("30 (+10)");
  });

  it("does not crash on an out-of-range ability score", () => {
    render(<StatBlock monster={{ ...goblin, abilityScores: { ...goblin.abilityScores, strength: 0 } }} />);
    expect(screen.getByText("STR").closest("[role=row]")?.textContent).toContain("0 (—)");
  });

  it("shows an out-of-range challenge rating as written, with dashes for XP and bonus, instead of throwing", () => {
    render(<StatBlock monster={{ ...goblin, challengeRating: 31 }} />);
    expect(screen.getByText(/Challenge/).closest("p")?.textContent).toContain("31 (XP unknown)");
    expect(screen.getByText(/Proficiency Bonus/).closest("p")?.textContent).toContain("—");
  });

  it("shows the legendary actions heading without inventing a number of actions", () => {
    render(<StatBlock monster={{ ...goblin, legendaryActions: [{ name: "Detect", description: "Looks.", usage: null, legendaryCost: 1 }] }} />);
    expect(screen.getByRole("heading", { name: "Legendary Actions" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/3 legendary actions/);
  });
});
