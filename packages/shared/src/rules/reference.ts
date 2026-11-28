import { z } from "zod";
import { AbilityKey, DmOnly, Supersedes, DocumentKey, RecordId } from "./common.js";

/** The kinds of reference entry. One table holds them all; `kind` tells them apart. */
export const REFERENCE_KINDS = [
  "ability",
  "skill",
  "creature-type",
  "damage-type",
  "alignment",
  "spell-school",
  "size",
  "item-rarity",
  "item-category",
  "language",
  "environment",
  "weapon-property",
] as const;
export const ReferenceKind = z.enum(REFERENCE_KINDS);
export type ReferenceKind = z.infer<typeof ReferenceKind>;

const base = {
  id: RecordId,
  documentKey: DocumentKey,
  dmOnly: DmOnly,
  supersedes: Supersedes,
  name: z.string().min(1),
  /** Markdown. Empty when the source gives none. */
  description: z.string(),
};

const AbilityAbbreviation = z.enum(["str", "dex", "con", "int", "wis", "cha"]);

/** A game term with its description. Each kind adds the few fields that belong to it. */
export const ReferenceEntry = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("ability"), abbreviation: AbilityAbbreviation, abilityKey: AbilityKey }),
  z.object({ ...base, kind: z.literal("skill"), ability: AbilityKey }),
  z.object({ ...base, kind: z.literal("creature-type") }),
  z.object({ ...base, kind: z.literal("damage-type") }),
  z.object({
    ...base,
    kind: z.literal("alignment"),
    shortName: z.string().min(1),
    /** `good`, `neutral` or `evil`. */
    morality: z.string().min(1),
    /** `lawful`, `neutral` or `chaotic`. */
    societalAttitude: z.string().min(1),
  }),
  z.object({ ...base, kind: z.literal("spell-school") }),
  z.object({
    ...base,
    kind: z.literal("size"),
    /** 1 for Tiny, up to 6 for Gargantuan. */
    rank: z.number().int().min(0),
    /** The width of the square a creature of this size controls, in feet. */
    spaceFeet: z.number().min(0),
    /** The hit die suggested for monsters of this size, such as `d8`. */
    hitDie: z.string().min(1),
  }),
  z.object({ ...base, kind: z.literal("item-rarity"), rank: z.number().int().min(0) }),
  z.object({ ...base, kind: z.literal("item-category") }),
  z.object({
    ...base,
    kind: z.literal("language"),
    exotic: z.boolean(),
    secret: z.boolean(),
    /** The key of the language whose script this one uses; null when it has none of its own. */
    script: z.string().min(1).nullable(),
  }),
  z.object({ ...base, kind: z.literal("environment"), aquatic: z.boolean(), planar: z.boolean(), interior: z.boolean() }),
  z.object({
    ...base,
    kind: z.literal("weapon-property"),
    /** Open5e marks 2024 weapon masteries here; null for an ordinary property. */
    propertyType: z.string().min(1).nullable(),
  }),
]);
export type ReferenceEntry = z.infer<typeof ReferenceEntry>;
