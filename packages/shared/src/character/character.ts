import { z } from "zod";
import { Ability, Skill } from "./ability.js";
import { Grant, SourceRef } from "./effect.js";

const Score = z.number().int().min(1).max(20);
export const AbilityScores = z.object({ str: Score, dex: Score, con: Score, int: Score, wis: Score, cha: Score });
export type AbilityScores = z.infer<typeof AbilityScores>;

/** One 4d6 roll: the four dice, and the index of the die that was dropped. */
export const RolledSet = z.object({
  dice: z.tuple([z.number().int().min(1).max(6), z.number().int().min(1).max(6), z.number().int().min(1).max(6), z.number().int().min(1).max(6)]),
  droppedIndex: z.number().int().min(0).max(3),
});
export type RolledSet = z.infer<typeof RolledSet>;

/** Base scores (before race and other bonuses) and how they were chosen. */
export const AbilityScoreMethod = z.discriminatedUnion("method", [
  z.object({ method: z.literal("standardArray"), scores: AbilityScores }),
  z.object({ method: z.literal("pointBuy"), scores: AbilityScores }),
  z.object({ method: z.literal("rolled"), scores: AbilityScores, rolls: z.array(RolledSet).length(6) }),
  z.object({ method: z.literal("manual"), scores: AbilityScores }),
]);
export type AbilityScoreMethod = z.infer<typeof AbilityScoreMethod>;

export const CharacterWeapon = z.object({
  id: z.string().min(1).max(100),
  /** The rules record, or null for a custom weapon. */
  weaponId: z.string().min(1).max(200).nullable(),
  name: z.string().min(1).max(100),
  /** Magic weapon bonus to attack and damage. */
  magicBonus: z.number().int().min(0).max(3).default(0),
  /** Used when `weaponId` is null. */
  custom: z
    .object({
      kind: z.enum(["melee", "ranged"]),
      damageDice: z.string().min(1).max(20),
      damageType: z.string().min(1).max(50).nullable(),
      finesse: z.boolean(),
      proficient: z.boolean(),
    })
    .nullable()
    .default(null),
});
export type CharacterWeapon = z.infer<typeof CharacterWeapon>;

export const SpellSlotLevel = z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);

export const CharacterData = z.object({
  name: z.string().min(1).max(100),
  level: z.number().int().min(1).max(20),
  abilityScores: AbilityScoreMethod,
  race: SourceRef.nullable(),
  subrace: SourceRef.nullable(),
  class: SourceRef.nullable(),
  subclass: SourceRef.nullable(),
  background: SourceRef.nullable(),
  grants: z.array(Grant).max(300),
  /** Skills chosen by the player (from class or background options). */
  skillChoices: z.array(Skill).max(18),
  hitDie: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  equipment: z.object({
    armorId: z.string().min(1).max(200).nullable(),
    shield: z.boolean(),
    weapons: z.array(CharacterWeapon).max(30),
    inventory: z.string().max(5000),
  }),
  spellcastingAbility: Ability.nullable(),
  knownSpellIds: z.array(z.string().min(1).max(200)).max(300),
  preparedSpellIds: z.array(z.string().min(1).max(200)).max(300),
  /** Live tracking. `currentHp` null means at full health. */
  currentHp: z.number().int().min(0).max(9999).nullable(),
  tempHp: z.number().int().min(0).max(9999),
  spentSpellSlots: z.partialRecord(SpellSlotLevel, z.number().int().min(0).max(20)),
  conditionIds: z.array(z.string().min(1).max(200)).max(30),
  notes: z.string().max(10000),
});
export type CharacterData = z.infer<typeof CharacterData>;
