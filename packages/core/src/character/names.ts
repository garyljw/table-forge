import { ABILITIES, ABILITY_LABELS, SKILLS, SKILL_LABELS, type Ability, type Skill } from "@table-forge/shared";

const letters = (text: string): string => text.toLowerCase().replace(/[^a-z]/g, "");

const SKILL_BY_NAME = new Map<string, Skill>();
for (const s of SKILLS) {
  SKILL_BY_NAME.set(letters(s), s);
  SKILL_BY_NAME.set(letters(SKILL_LABELS[s]), s);
}

/** Match a skill from free text: "Sleight of Hand", "sleight_of_hand", "sleightOfHand", "SLEIGHT OF HAND". */
export function parseSkill(text: string): Skill | null {
  return SKILL_BY_NAME.get(letters(text)) ?? null;
}

const ABILITY_BY_NAME = new Map<string, Ability>();
for (const a of ABILITIES) {
  ABILITY_BY_NAME.set(a, a);
  ABILITY_BY_NAME.set(letters(ABILITY_LABELS[a]), a);
}

/** Match an ability from "str", "Strength", "STRENGTH" and similar. */
export function parseAbility(text: string): Ability | null {
  const t = letters(text);
  return ABILITY_BY_NAME.get(t) ?? null;
}
