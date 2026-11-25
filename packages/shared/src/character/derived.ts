import { z } from "zod";
import type { Ability, Skill } from "./ability.js";
import { SourceRef } from "./effect.js";

export const BreakdownPart = z.object({ label: z.string(), value: z.number(), source: SourceRef.nullable() });
export type BreakdownPart = z.infer<typeof BreakdownPart>;

/** A number and the parts that add up to it, so the UI can explain it. */
export const Breakdown = z.object({ total: z.number(), parts: z.array(BreakdownPart) });
export type Breakdown = z.infer<typeof Breakdown>;

export interface DerivedAbility {
  score: Breakdown;
  modifier: number;
}

export interface DerivedSave {
  bonus: Breakdown;
  proficient: boolean;
}

export interface DerivedSkill {
  ability: Ability;
  bonus: Breakdown;
  proficient: boolean;
  expertise: boolean;
}

export interface DerivedWeaponAttack {
  id: string;
  name: string;
  attackBonus: Breakdown;
  proficient: boolean;
  /** Null when the weapon does no damage (net). */
  damage: { dice: string; bonus: Breakdown; damageType: string | null; text: string } | null;
  rangeText: string;
  properties: string[];
}

export interface DerivedSpellSlot {
  level: number;
  total: number;
  spent: number;
}

export interface DerivedSpellcasting {
  ability: Ability;
  saveDc: Breakdown;
  attackBonus: Breakdown;
  slots: DerivedSpellSlot[];
}

export interface DerivedFeatureGroup {
  source: SourceRef;
  traits: { name: string; text: string }[];
}

export interface DerivedSheet {
  abilities: Record<Ability, DerivedAbility>;
  proficiencyBonus: Breakdown;
  saves: Record<Ability, DerivedSave>;
  skills: Record<Skill, DerivedSkill>;
  passivePerception: Breakdown;
  initiative: Breakdown;
  speed: Breakdown;
  darkvision: Breakdown | null;
  armorClass: Breakdown;
  maxHp: Breakdown;
  attacks: DerivedWeaponAttack[];
  spellcasting: DerivedSpellcasting | null;
  resistances: string[];
  features: DerivedFeatureGroup[];
  warnings: string[];
}
