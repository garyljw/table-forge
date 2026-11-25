import {
  ABILITIES,
  ABILITY_LABELS,
  SKILLS,
  SKILL_ABILITY,
  SKILL_LABELS,
  type Ability,
  type Armor,
  type Breakdown,
  type BreakdownPart,
  type CharacterData,
  type CharacterWeapon,
  type ClassDetail,
  type DerivedAbility,
  type DerivedFeatureGroup,
  type DerivedSave,
  type DerivedSheet,
  type DerivedSkill,
  type DerivedSpellcasting,
  type DerivedWeaponAttack,
  type Grant,
  type Skill,
  type SourceRef,
  type Weapon,
} from "@table-forge/shared";
import { abilityModifier } from "../ability.js";
import { parseAbility, parseSkill } from "./names.js";
import { effectsBySource } from "./effects.js";
import { proficiencyBonusForLevel } from "./proficiency.js";
import { validateManual, validatePointBuy, validateRolled, validateStandardArray } from "./scores.js";
import { spellSlotsForLevel } from "./spellSlots.js";

/** The looked-up records the maths needs. Core does no fetching; the caller supplies these. */
export interface CharacterRules {
  classDetail: ClassDetail | null;
  /** The worn armour record, when `equipment.armorId` is set. */
  armor: Armor | null;
  /** Weapon records by id. */
  weapons: Readonly<Record<string, Weapon>>;
}

const MANUAL: SourceRef = { kind: "manual", id: null, name: "Manual" };

export function breakdown(parts: BreakdownPart[]): Breakdown {
  return { total: parts.reduce((sum, p) => sum + p.value, 0), parts };
}
const part = (label: string, value: number, source: SourceRef | null = null): BreakdownPart => ({ label, value, source });
const signed = (n: number): string => (n >= 0 ? `+${String(n)}` : String(n));

function ofType<T extends Grant["effect"]["type"]>(grants: readonly Grant[], type: T): { grant: Grant; effect: Extract<Grant["effect"], { type: T }> }[] {
  return grants.flatMap((g) => (g.effect.type === type ? [{ grant: g, effect: g.effect as Extract<Grant["effect"], { type: T }> }] : []));
}

function hasProficiency(grants: readonly Grant[], category: string, keys: readonly string[]): Grant | null {
  const wanted = keys.map((k) => k.toLowerCase());
  for (const g of grants) {
    if (g.effect.type === "proficiency" && g.effect.category === category && wanted.includes(g.effect.key.toLowerCase())) return g;
  }
  return null;
}

const hasProperty = (w: Weapon, name: string): boolean => w.properties.some((p) => p.name.toLowerCase() === name);

export function deriveSheet(character: CharacterData, rules: CharacterRules): DerivedSheet {
  const warnings: string[] = [];
  const grants = character.grants;
  const level = character.level;
  const prof = proficiencyBonusForLevel(level);
  const profPart = part("Proficiency bonus", prof);

  // Ability scores.
  const method = character.abilityScores;
  const check =
    method.method === "standardArray"
      ? validateStandardArray(method.scores)
      : method.method === "pointBuy"
        ? validatePointBuy(method.scores)
        : method.method === "rolled"
          ? validateRolled(method.scores, method.rolls)
          : validateManual(method.scores);
  warnings.push(...check.errors, ...check.warnings);
  const methodLabel = { standardArray: "standard array", pointBuy: "point buy", rolled: "rolled", manual: "manual" }[method.method];

  const abilities = {} as Record<Ability, DerivedAbility>;
  for (const a of ABILITIES) {
    const parts = [part(`Base score (${methodLabel})`, method.scores[a])];
    const bonuses = ofType(grants, "abilityBonus").filter(({ effect }) => effect.ability === a);
    for (const { grant, effect } of bonuses) if (grant.source.kind !== "item") parts.push(part(grant.source.name, effect.amount, grant.source));
    let total = parts.reduce((s, p) => s + p.value, 0);
    if (total > 20) {
      warnings.push(`${ABILITY_LABELS[a]} is capped at 20 (it would be ${String(total)})`);
      parts.push(part("Capped at 20", 20 - total));
      total = 20;
    }
    // Magic items can take a score past 20, so they are added after the cap.
    for (const { grant, effect } of bonuses) {
      if (grant.source.kind === "item") {
        parts.push(part(grant.source.name, effect.amount, grant.source));
        total += effect.amount;
      }
    }
    if (total < 1) {
      warnings.push(`${ABILITY_LABELS[a]} would be ${String(total)}; raised to 1`);
      parts.push(part("Minimum 1", 1 - total));
    }
    const bd = breakdown(parts);
    abilities[a] = { score: bd, modifier: abilityModifier(bd.total) };
  }
  const mod = (a: Ability): number => abilities[a].modifier;
  const modPart = (a: Ability): BreakdownPart => part(`${ABILITY_LABELS[a]} modifier`, mod(a));

  // Saving throws.
  const classSource: SourceRef | null =
    character.class ?? (rules.classDetail ? { kind: "class", id: rules.classDetail.id, name: rules.classDetail.name } : null);
  const saveSources = new Map<Ability, SourceRef>();
  for (const name of rules.classDetail?.savingThrows ?? []) {
    const a = parseAbility(name);
    if (a && classSource) saveSources.set(a, classSource);
    else if (!a) warnings.push(`Unrecognised class saving throw "${name}"`);
  }
  for (const { grant, effect } of ofType(grants, "proficiency")) {
    if (effect.category !== "save") continue;
    const a = parseAbility(effect.key);
    if (a) saveSources.set(a, saveSources.get(a) ?? grant.source);
    else warnings.push(`Unrecognised saving throw proficiency "${effect.key}"`);
  }
  const saves = {} as Record<Ability, DerivedSave>;
  for (const a of ABILITIES) {
    const src = saveSources.get(a);
    const parts = [modPart(a)];
    if (src) parts.push(part("Proficiency bonus", prof, src));
    saves[a] = { bonus: breakdown(parts), proficient: src !== undefined };
  }

  // Skills.
  const skillSources = new Map<Skill, SourceRef>();
  for (const { grant, effect } of ofType(grants, "proficiency")) {
    if (effect.category !== "skill") continue;
    const s = parseSkill(effect.key);
    if (s) skillSources.set(s, skillSources.get(s) ?? grant.source);
    else warnings.push(`Unrecognised skill proficiency "${effect.key}"`);
  }
  for (const s of character.skillChoices) if (!skillSources.has(s)) skillSources.set(s, MANUAL);
  const expertSources = new Map<Skill, SourceRef>();
  for (const { grant, effect } of ofType(grants, "expertise")) {
    const s = parseSkill(effect.skill);
    if (!s) warnings.push(`Unrecognised expertise skill "${effect.skill}"`);
    else if (!skillSources.has(s)) warnings.push(`Expertise in ${SKILL_LABELS[s]} needs proficiency in it first; ignored`);
    else expertSources.set(s, grant.source);
  }
  const skills = {} as Record<Skill, DerivedSkill>;
  for (const s of SKILLS) {
    const ability = SKILL_ABILITY[s];
    const parts = [modPart(ability)];
    const ps = skillSources.get(s);
    const es = expertSources.get(s);
    if (ps) parts.push(part("Proficiency bonus", prof, ps));
    if (es) parts.push(part("Expertise (proficiency bonus again)", prof, es));
    skills[s] = { ability, bonus: breakdown(parts), proficient: ps !== undefined, expertise: es !== undefined };
  }
  const passivePerception = breakdown([part("Base", 10), ...skills.perception.bonus.parts]);
  const initiative = breakdown([modPart("dex")]);

  // Armour and AC.
  const eq = character.equipment;
  let armor: Armor | null = null;
  if (eq.armorId !== null) {
    if (rules.armor && rules.armor.id === eq.armorId && rules.armor.category !== "shield") armor = rules.armor;
    else warnings.push("The worn armour could not be looked up, so it is ignored");
  }
  const acParts: BreakdownPart[] = [];
  const armorSource: SourceRef | null = armor ? { kind: "item", id: armor.id, name: armor.name } : null;
  const unarmored = ofType(grants, "unarmoredDefense");
  let speedPenalty = 0;
  if (armor) {
    acParts.push(part(armor.name, armor.acBase, armorSource));
    if (armor.addsDexModifier) {
      const cap = armor.dexModifierCap;
      const dex = cap === null ? mod("dex") : Math.min(mod("dex"), cap);
      acParts.push(part(cap !== null && mod("dex") > cap ? `Dexterity modifier (max ${String(cap)})` : "Dexterity modifier", dex));
    }
    if (!hasProficiency(grants, "armor", [armor.category])) {
      warnings.push(`Not proficient with ${armor.category} armour: disadvantage on STR and DEX checks, saves and attacks, and no spellcasting`);
    }
    if (armor.strengthRequired !== null && abilities.str.score.total < armor.strengthRequired) {
      speedPenalty = 10;
      warnings.push(`${armor.name} needs Strength ${String(armor.strengthRequired)}; speed is reduced by 10 ft`);
    }
    if (armor.stealthDisadvantage) warnings.push(`${armor.name} gives disadvantage on Stealth checks`);
  } else {
    const usable = unarmored.filter(({ effect }) => effect.shieldAllowed || !eq.shield);
    if (unarmored.length > usable.length) warnings.push("Unarmored Defense does not work while carrying a shield");
    let best: { grant: Grant; abilities: Ability[]; total: number } | null = null;
    for (const { grant, effect } of usable) {
      const total = mod("dex") + effect.abilities.reduce((s, a) => s + mod(a), 0);
      if (best === null || total > best.total) best = { grant, abilities: effect.abilities, total };
    }
    acParts.push(part("Base", 10));
    acParts.push(modPart("dex"));
    if (best) {
      for (const a of best.abilities) acParts.push(part(`${ABILITY_LABELS[a]} modifier (Unarmored Defense)`, mod(a), best.grant.source));
    }
  }
  if (eq.shield) {
    acParts.push(part("Shield", 2, { kind: "item", id: null, name: "Shield" }));
    if (!hasProficiency(grants, "armor", ["shield"])) warnings.push("Not proficient with shields");
  }
  for (const { grant, effect } of ofType(grants, "acBonus")) acParts.push(part(grant.source.name, effect.amount, grant.source));
  const armorClass = breakdown(acParts);

  // Speed and darkvision.
  const bases = ofType(grants, "speed");
  const baseSpeed = bases.reduce<(typeof bases)[number] | null>((best, g) => (best === null || g.effect.feet > best.effect.feet ? g : best), null);
  const speedParts = [baseSpeed ? part(`Base speed (${baseSpeed.grant.source.name})`, baseSpeed.effect.feet, baseSpeed.grant.source) : part("Default speed (no race speed given)", 30)];
  for (const { grant, effect } of ofType(grants, "speedBonus")) speedParts.push(part(grant.source.name, effect.feet, grant.source));
  if (speedPenalty > 0) speedParts.push(part("Armour too heavy for your Strength", -speedPenalty, armorSource));
  const speed = breakdown(speedParts);
  const dv = ofType(grants, "darkvision");
  const bestDv = dv.reduce<(typeof dv)[number] | null>((best, g) => (best === null || g.effect.feet > best.effect.feet ? g : best), null);
  const darkvision = bestDv && bestDv.effect.feet > 0 ? breakdown([part(`Darkvision (${bestDv.grant.source.name})`, bestDv.effect.feet, bestDv.grant.source)]) : null;

  // Hit points.
  const die = character.hitDie;
  const avg = Math.floor(die / 2) + 1;
  const hpParts: BreakdownPart[] = [part(`Level 1: hit die d${String(die)} maximum`, die, classSource)];
  const conMod = mod("con");
  hpParts.push(part("Constitution modifier at level 1", conMod));
  if (level > 1) {
    hpParts.push(part(`Levels 2-${String(level)}: average ${String(avg)} per level`, avg * (level - 1), classSource));
    hpParts.push(part(`Constitution modifier for levels 2-${String(level)}`, conMod * (level - 1)));
  }
  for (const { grant, effect } of ofType(grants, "hpBonusPerLevel")) hpParts.push(part(`${grant.source.name} (${signed(effect.amount)} per level)`, effect.amount * level, grant.source));
  const rawHp = hpParts.reduce((s, p) => s + p.value, 0);
  if (rawHp < level) hpParts.push(part("Minimum 1 per level", level - rawHp));
  const maxHp = breakdown(hpParts);

  // Weapon attacks.
  const attacks = character.equipment.weapons.map((w) => deriveAttack(w, rules.weapons, abilities, grants, prof, warnings));

  // Spellcasting.
  let spellcasting: DerivedSpellcasting | null = null;
  if (character.spellcastingAbility) {
    const a = character.spellcastingAbility;
    let slots: DerivedSpellcasting["slots"] = [];
    const cd = rules.classDetail;
    if (cd) {
      const table = spellSlotsForLevel(cd.table, level);
      // TODO(level-up slice): when a warlock's slot level changes, spent slots keyed by the old level are not remapped.
      slots = table.slots.map((s) => ({ level: s.level, total: s.total, spent: Math.min(s.total, character.spentSpellSlots[String(s.level) as "1"] ?? 0) }));
      if (!table.found && cd.casterType !== null && cd.casterType !== "NONE") {
        warnings.push(`No spell slot data found for ${cd.name}; add slots by hand`);
      }
    } else {
      warnings.push("No class data, so spell slots are unknown");
    }
    spellcasting = {
      ability: a,
      saveDc: breakdown([part("Base", 8), profPart, modPart(a)]),
      attackBonus: breakdown([profPart, modPart(a)]),
      slots,
    };
  }

  // Features and resistances.
  const features: DerivedFeatureGroup[] = [];
  for (const group of effectsBySource(grants)) {
    const traits = group.grants.flatMap((g) => (g.effect.type === "trait" ? [{ name: g.effect.name, text: g.effect.text }] : []));
    if (traits.length > 0) features.push({ source: group.source, traits });
  }
  const resistances = [...new Set(ofType(grants, "resistance").map(({ effect }) => effect.damageType.toLowerCase()))];

  return {
    abilities,
    proficiencyBonus: breakdown([profPart]),
    saves,
    skills,
    passivePerception,
    initiative,
    speed,
    darkvision,
    armorClass,
    maxHp,
    attacks,
    spellcasting,
    resistances,
    features,
    warnings,
  };
}

function deriveAttack(
  w: CharacterWeapon,
  records: Readonly<Record<string, Weapon>>,
  abilities: Record<Ability, DerivedAbility>,
  grants: readonly Grant[],
  prof: number,
  warnings: string[],
): DerivedWeaponAttack {
  const record = w.weaponId !== null ? records[w.weaponId] : undefined;
  if (w.weaponId !== null && !record) warnings.push(`Weapon record for ${w.name} not found; treated as a custom weapon`);
  const custom = w.custom;
  const kind = record?.kind ?? custom?.kind ?? "melee";
  const finesse = record ? hasProperty(record, "finesse") : (custom?.finesse ?? false);
  const dice = record?.damageDice ?? custom?.damageDice ?? "0";
  const damageType = record ? record.damageType : (custom?.damageType ?? null);

  let ability: Ability;
  if (finesse) ability = abilities.str.modifier >= abilities.dex.modifier ? "str" : "dex";
  else ability = kind === "ranged" ? "dex" : "str";

  let proficientSource: SourceRef | null = null;
  if (record) {
    const g = hasProficiency(grants, "weapon", [record.category, record.id, record.name]);
    if (g) proficientSource = g.source;
  } else {
    const g = hasProficiency(grants, "weapon", [w.name]);
    if (g) proficientSource = g.source;
    else if (custom?.proficient) proficientSource = MANUAL;
  }
  const mod = abilities[ability].modifier;
  const modPart: BreakdownPart = part(`${ABILITY_LABELS[ability]} modifier`, mod);
  const attackParts = [modPart];
  if (proficientSource) attackParts.push(part("Proficiency bonus", prof, proficientSource));
  if (w.magicBonus > 0) attackParts.push(part("Magic weapon", w.magicBonus));

  let damage: DerivedWeaponAttack["damage"] = null;
  if (dice.trim() !== "" && dice.trim() !== "0") {
    const bonus = breakdown([modPart, ...(w.magicBonus > 0 ? [part("Magic weapon", w.magicBonus)] : [])]);
    const sign = bonus.total === 0 ? "" : ` ${bonus.total > 0 ? "+" : "-"} ${String(Math.abs(bonus.total))}`;
    damage = { dice, bonus, damageType, text: `${dice}${sign}${damageType ? ` ${damageType}` : ""}` };
  }
  const reach = record !== undefined && hasProperty(record, "reach");
  const melee = `Melee ${reach ? "10" : "5"} ft`;
  const rangeFeet = record?.range ? `${String(record.range.normalFeet)}/${String(record.range.longFeet)} ft` : null;
  let rangeText: string;
  if (kind === "ranged") rangeText = rangeFeet ?? "Ranged";
  else if (rangeFeet !== null) rangeText = `${melee} (thrown ${rangeFeet})`;
  else rangeText = melee;
  return {
    id: w.id,
    name: w.name,
    attackBonus: breakdown(attackParts),
    proficient: proficientSource !== null,
    damage,
    rangeText,
    properties: record?.properties.map((p) => (p.detail ? `${p.name} (${p.detail})` : p.name)) ?? [],
  };
}

