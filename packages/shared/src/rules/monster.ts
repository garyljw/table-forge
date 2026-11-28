import { z } from "zod";
import { DocumentKey, RecordId, DmOnly, Supersedes } from "./common.js";

export const MonsterSpeed = z.object({
  walk: z.number().int().nullable(),
  fly: z.number().int().nullable(),
  swim: z.number().int().nullable(),
  climb: z.number().int().nullable(),
  burrow: z.number().int().nullable(),
  hover: z.boolean(),
  /** Always feet; the app works in feet. */
  unit: z.literal("feet"),
});

export const MonsterAbilityScores = z.object({
  strength: z.number().int(),
  dexterity: z.number().int(),
  constitution: z.number().int(),
  intelligence: z.number().int(),
  wisdom: z.number().int(),
  charisma: z.number().int(),
});

/** How often a limited action can be used. */
export const ActionUsage = z.object({
  kind: z.enum(["recharge", "perDay"]),
  /** Recharge on a roll of this number or higher, or uses per day. */
  value: z.number().int(),
});

/** A trait, action, bonus action, reaction or legendary action. */
export const MonsterFeature = z.object({
  name: z.string().min(1),
  description: z.string(),
  usage: ActionUsage.nullable(),
  /** Legendary action cost; set only on legendary actions. */
  legendaryCost: z.number().int().nullable(),
});
export type MonsterFeature = z.infer<typeof MonsterFeature>;

/**
 * A lair actions or regional effects block: an intro paragraph (may be empty) and the
 * entries under it. `legendaryCost` and `usage` are normally null on these entries.
 */
export const MonsterLairSection = z.object({
  description: z.string(),
  items: z.array(MonsterFeature),
});
export type MonsterLairSection = z.infer<typeof MonsterLairSection>;

export const MonsterSummary = z.object({
  id: RecordId,
  documentKey: DocumentKey,
  name: z.string().min(1),
  /** Size key, e.g. `large`. */
  size: z.string().min(1),
  /** Creature type key, e.g. `dragon`. */
  type: z.string().min(1),
  /** Challenge rating as a number: 0.125, 0.25, 0.5, 1, 2, ... */
  challengeRating: z.number().min(0),
  armorClass: z.number().int(),
  hitPoints: z.number().int(),
});
export type MonsterSummary = z.infer<typeof MonsterSummary>;

export const Monster = MonsterSummary.extend({
  dmOnly: DmOnly,
  supersedes: Supersedes,
  /** Open5e subcategory, e.g. `Dragons, Chromatic`. */
  subtype: z.string().nullable(),
  alignment: z.string(),
  armorDetail: z.string().nullable(),
  /** Hit dice formula, e.g. `19d12+133`. Some sources omit it. */
  hitDice: z.string().nullable(),
  speed: MonsterSpeed,
  abilityScores: MonsterAbilityScores,
  /** Only the saving throws the stat block lists, as total bonuses. */
  savingThrows: z.record(z.string(), z.number().int()),
  /** Only the skills the stat block lists, as total bonuses. */
  skills: z.record(z.string(), z.number().int()),
  /** Damage and condition lines as written, e.g. `bludgeoning from nonmagical attacks`. Empty when none. */
  damageVulnerabilities: z.string(),
  damageResistances: z.string(),
  damageImmunities: z.string(),
  conditionImmunities: z.string(),
  senses: z.object({
    darkvision: z.number().int().nullable(),
    blindsight: z.number().int().nullable(),
    tremorsense: z.number().int().nullable(),
    truesight: z.number().int().nullable(),
    passivePerception: z.number().int().nullable(),
  }),
  languages: z.string(),
  experiencePoints: z.number().int().nullable(),
  proficiencyBonus: z.number().int().nullable(),
  environments: z.array(z.string()),
  traits: z.array(MonsterFeature),
  actions: z.array(MonsterFeature),
  bonusActions: z.array(MonsterFeature),
  reactions: z.array(MonsterFeature),
  legendaryActions: z.array(MonsterFeature),
  /**
   * Lair actions and regional effects, or null when the creature has none. Both default to
   * null so monster rows imported before these fields existed still validate.
   */
  lairActions: MonsterLairSection.nullable().default(null),
  regionalEffects: MonsterLairSection.nullable().default(null),
});
export type Monster = z.infer<typeof Monster>;
