import type { Armor, CharacterData, ClassDetail, Grant, SourceRef, Weapon } from "@table-forge/shared";
import type { CharacterRules } from "./derive.js";

export const src = (kind: SourceRef["kind"], name: string): SourceRef => ({ kind, id: `srd_${name.toLowerCase().replace(/\s+/g, "-")}`, name });

export const grant = (source: SourceRef, effect: Grant["effect"]): Grant => ({ source, effect });

export function makeCharacter(over: Partial<CharacterData> = {}): CharacterData {
  return {
    name: "Test",
    level: 1,
    abilityScores: { method: "standardArray", scores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
    race: null,
    subrace: null,
    class: null,
    subclass: null,
    background: null,
    grants: [],
    skillChoices: [],
    hitDie: 8,
    equipment: { armorId: null, shield: false, weapons: [], inventory: "" },
    spellcastingAbility: null,
    knownSpellIds: [],
    preparedSpellIds: [],
    currentHp: null,
    tempHp: 0,
    spentSpellSlots: {},
    conditionIds: [],
    notes: "",
    ...over,
  };
}

const armor = (id: string, name: string, category: Armor["category"], acBase: number, p: Partial<Armor> = {}): Armor => ({
  id,
  documentKey: "srd-2014",
  dmOnly: false,
  name,
  category,
  acBase,
  addsDexModifier: false,
  dexModifierCap: null,
  strengthRequired: null,
  stealthDisadvantage: false,
  acDisplay: "",
  ...p,
});
export const studdedLeather = armor("srd_studded-leather", "Studded Leather", "light", 12, { addsDexModifier: true });
export const scaleMail = armor("srd_scale-mail", "Scale Mail", "medium", 14, { addsDexModifier: true, dexModifierCap: 2, stealthDisadvantage: true });
export const chainMail = armor("srd_chain-mail", "Chain Mail", "heavy", 16, { strengthRequired: 13, stealthDisadvantage: true });
export const plate = armor("srd_plate", "Plate", "heavy", 18, { strengthRequired: 15, stealthDisadvantage: true });

const weapon = (id: string, name: string, category: Weapon["category"], kind: Weapon["kind"], damageDice: string, damageType: string | null, props: string[], range: Weapon["range"] = null): Weapon => ({
  id,
  documentKey: "srd-2014",
  dmOnly: false,
  name,
  category,
  kind,
  damageDice,
  damageType,
  improvised: false,
  range,
  properties: props.map((name) => ({ name, detail: null, description: "" })),
});
export const rapier = weapon("srd_rapier", "Rapier", "martial", "melee", "1d8", "piercing", ["Finesse"]);
export const longsword = weapon("srd_longsword", "Longsword", "martial", "melee", "1d8", "slashing", ["Versatile"]);
export const handaxe = weapon("srd_handaxe", "Handaxe", "simple", "melee", "1d6", "slashing", ["Light", "Thrown"], { normalFeet: 20, longFeet: 60 });
export const longbow = weapon("srd_longbow", "Longbow", "martial", "ranged", "1d8", "piercing", ["Ammunition", "Heavy"], { normalFeet: 150, longFeet: 600 });
export const net = weapon("srd_net", "Net", "martial", "ranged", "0", null, ["Thrown"], { normalFeet: 5, longFeet: 15 });
export const dagger = weapon("srd_dagger", "Dagger", "simple", "melee", "1d4", "piercing", ["Finesse", "Light", "Thrown"], { normalFeet: 20, longFeet: 60 });

export const weaponRecords = Object.fromEntries([rapier, longsword, handaxe, longbow, net, dagger].map((w) => [w.id, w]));

export function makeClass(name: string, saves: string[], casterType: string | null, table: ClassDetail["table"] = []): ClassDetail {
  return {
    id: `srd_${name.toLowerCase()}`,
    dmOnly: false,
    documentKey: "srd-2014",
    name,
    parentClass: null,
    hitDice: "D8",
    casterType,
    description: "",
    hitPoints: null,
    savingThrows: saves,
    primaryAbilities: [],
    proficiencies: null,
    startingEquipment: null,
    features: [],
    table,
  };
}

export const rules = (over: Partial<CharacterRules> = {}): CharacterRules => ({ classDetail: null, armor: null, weapons: weaponRecords, ...over });
