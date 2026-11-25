import { ABILITY_LABELS, SKILL_LABELS, type Effect, type Grant, type SourceRef } from "@table-forge/shared";
import { parseAbility, parseSkill } from "./names.js";

export function sourceKey(s: SourceRef): string {
  return `${s.kind}:${s.id ?? s.name}`;
}

export interface SourceGrants {
  source: SourceRef;
  grants: Grant[];
}

/** Group grants by source, in the order each source first appears. */
export function effectsBySource(grants: readonly Grant[]): SourceGrants[] {
  const groups = new Map<string, SourceGrants>();
  for (const g of grants) {
    const key = sourceKey(g.source);
    const group = groups.get(key);
    if (group) group.grants.push(g);
    else groups.set(key, { source: g.source, grants: [g] });
  }
  return [...groups.values()];
}

const signed = (n: number): string => (n >= 0 ? `+${String(n)}` : String(n));
const titleCase = (s: string): string => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1));

function proficiencyLabel(key: string, category: string): string {
  if (category === "skill") {
    const skill = parseSkill(key);
    return skill ? SKILL_LABELS[skill] : titleCase(key);
  }
  if (category === "save") {
    const ability = parseAbility(key);
    return `${ability ? ABILITY_LABELS[ability] : titleCase(key)} saving throws`;
  }
  if (category === "armor") return key === "shield" ? "shields" : `${key} armor`;
  return titleCase(key);
}

/** A short human description of an effect, e.g. "+2 Strength". */
export function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case "abilityBonus":
      return `${signed(effect.amount)} ${ABILITY_LABELS[effect.ability]}`;
    case "proficiency":
      return `Proficiency: ${proficiencyLabel(effect.key, effect.category)}${effect.category === "weapon" && (effect.key === "simple" || effect.key === "martial") ? " weapons" : ""}`;
    case "expertise":
      return `Expertise: ${(parseSkill(effect.skill) ? SKILL_LABELS[parseSkill(effect.skill)!] : titleCase(effect.skill))}`;
    case "speed":
      return `Speed ${String(effect.feet)} ft`;
    case "speedBonus":
      return `${signed(effect.feet)} ft speed`;
    case "darkvision":
      return `Darkvision ${String(effect.feet)} ft`;
    case "hpBonusPerLevel":
      return `${signed(effect.amount)} HP per level`;
    case "acBonus":
      return `${signed(effect.amount)} AC`;
    case "unarmoredDefense":
      return `Unarmored Defense (10 + Dex${effect.abilities.map((a) => ` + ${ABILITY_LABELS[a].slice(0, 3)}`).join("")})`;
    case "resistance":
      return `Resistance to ${effect.damageType} damage`;
    case "trait":
      return effect.name;
  }
}
