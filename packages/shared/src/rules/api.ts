import { z } from "zod";
import { Armor, ArmorCategory } from "./armor.js";
import { Background, BackgroundSummary } from "./background.js";
import { ClassDetail, ClassSummary } from "./class.js";
import { DocumentKey } from "./common.js";
import { Condition, ConditionSummary } from "./condition.js";
import { LicenseText, SourceDocument } from "./document.js";
import { Feat, FeatSummary } from "./feat.js";
import { MagicItem, MagicItemRarity, MagicItemSummary, MagicItemType } from "./magic-item.js";
import { Monster, MonsterSummary } from "./monster.js";
import { RollTable, RollTableCategory, RollTableSummary } from "./roll-table.js";
import { RuleSection, RuleSectionCategory, RuleSectionSummary } from "./rule-section.js";
import { Species, SpeciesSummary } from "./species.js";
import { Spell, SpellLevel, SpellSummary } from "./spell.js";
import { Weapon, WeaponCategory, WeaponKind, WeaponSummary } from "./weapon.js";

// ---- Query parameters (every value arrives as a string) ----

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

const intParam = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,9}$/, "must be a whole number")
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

const numberParam = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,3}(\.\d{1,3})?$/, "must be a number")
    .transform(Number)
    .pipe(z.number().min(min).max(max));

const boolParam = z.enum(["true", "false"]).transform((v) => v === "true");

const slugParam = z
  .string()
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "must be a lowercase slug");

/** Search and paging, shared by every list endpoint. */
export const ListQueryBase = z.object({
  /** Case-insensitive match on the name. */
  q: z.string().trim().min(1).max(100).optional(),
  /** Only records from this source document. */
  document: DocumentKey.optional(),
  page: intParam(1, 100_000).default(1),
  pageSize: intParam(1, MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListQueryBase = z.infer<typeof ListQueryBase>;

export const SpellListQuery = ListQueryBase.extend({
  level: intParam(0, 9).pipe(SpellLevel).optional(),
  school: slugParam.optional(),
  /** Class slug, e.g. `wizard`. */
  class: slugParam.optional(),
  concentration: boolParam.optional(),
  ritual: boolParam.optional(),
});
export type SpellListQuery = z.infer<typeof SpellListQuery>;

export const MonsterListQuery = ListQueryBase.extend({
  type: slugParam.optional(),
  size: slugParam.optional(),
  /** Challenge rating range, inclusive. Fractions are written as decimals (0.125, 0.25, 0.5). */
  crMin: numberParam(0, 30).optional(),
  crMax: numberParam(0, 30).optional(),
});
export type MonsterListQuery = z.infer<typeof MonsterListQuery>;

export const ClassListQuery = ListQueryBase.extend({
  /** `class` for base classes only, `subclass` for subclasses only. */
  kind: z.enum(["class", "subclass"]).optional(),
  /** Only subclasses of this class id. */
  parent: slugParam.optional(),
});
export type ClassListQuery = z.infer<typeof ClassListQuery>;

export const ConditionListQuery = ListQueryBase;
export type ConditionListQuery = z.infer<typeof ConditionListQuery>;

export const SpeciesListQuery = ListQueryBase.extend({
  /** `species` for base species only, `subspecies` for subspecies (subraces) only. */
  kind: z.enum(["species", "subspecies"]).optional(),
  /** Only subspecies of this species id. */
  parent: slugParam.optional(),
});
export type SpeciesListQuery = z.infer<typeof SpeciesListQuery>;

export const BackgroundListQuery = ListQueryBase;
export type BackgroundListQuery = z.infer<typeof BackgroundListQuery>;

export const FeatListQuery = ListQueryBase;
export type FeatListQuery = z.infer<typeof FeatListQuery>;

export const WeaponListQuery = ListQueryBase.extend({
  category: WeaponCategory.optional(),
  kind: WeaponKind.optional(),
  /** Damage type slug, e.g. `slashing`. */
  damageType: slugParam.optional(),
});
export type WeaponListQuery = z.infer<typeof WeaponListQuery>;

export const ArmorListQuery = ListQueryBase.extend({
  category: ArmorCategory.optional(),
});
export type ArmorListQuery = z.infer<typeof ArmorListQuery>;

export const MagicItemListQuery = ListQueryBase.extend({
  type: MagicItemType.optional(),
  rarity: MagicItemRarity.optional(),
  /** `true` for items that need attunement, `false` for those that do not. */
  attunement: boolParam.optional(),
});
export type MagicItemListQuery = z.infer<typeof MagicItemListQuery>;

export const RollTableListQuery = ListQueryBase.extend({
  category: RollTableCategory.optional(),
});
export type RollTableListQuery = z.infer<typeof RollTableListQuery>;

export const RuleSectionListQuery = ListQueryBase.extend({
  category: RuleSectionCategory.optional(),
});
export type RuleSectionListQuery = z.infer<typeof RuleSectionListQuery>;

// ---- Response bodies ----

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });

/** A detail response: the record plus the document it came from, for attribution. */
export const detail = <T extends z.ZodType>(data: T) => z.object({ data, document: SourceDocument });

export const SpellListResponse = paginated(SpellSummary);
export type SpellListResponse = z.infer<typeof SpellListResponse>;
export const SpellDetailResponse = detail(Spell);
export type SpellDetailResponse = z.infer<typeof SpellDetailResponse>;

export const MonsterListResponse = paginated(MonsterSummary);
export type MonsterListResponse = z.infer<typeof MonsterListResponse>;
export const MonsterDetailResponse = detail(Monster);
export type MonsterDetailResponse = z.infer<typeof MonsterDetailResponse>;

export const ClassListResponse = paginated(ClassSummary);
export type ClassListResponse = z.infer<typeof ClassListResponse>;
export const ClassDetailResponse = detail(ClassDetail).extend({
  /** Subclasses of this class, when it is a base class. */
  subclasses: z.array(ClassSummary),
});
export type ClassDetailResponse = z.infer<typeof ClassDetailResponse>;

export const ConditionListResponse = paginated(ConditionSummary);
export type ConditionListResponse = z.infer<typeof ConditionListResponse>;
export const ConditionDetailResponse = detail(Condition);
export type ConditionDetailResponse = z.infer<typeof ConditionDetailResponse>;

export const SpeciesListResponse = paginated(SpeciesSummary);
export type SpeciesListResponse = z.infer<typeof SpeciesListResponse>;
export const SpeciesDetailResponse = detail(Species).extend({
  /** Subspecies of this species, when it is a base species. */
  subspecies: z.array(SpeciesSummary),
});
export type SpeciesDetailResponse = z.infer<typeof SpeciesDetailResponse>;

export const BackgroundListResponse = paginated(BackgroundSummary);
export type BackgroundListResponse = z.infer<typeof BackgroundListResponse>;
export const BackgroundDetailResponse = detail(Background);
export type BackgroundDetailResponse = z.infer<typeof BackgroundDetailResponse>;

export const FeatListResponse = paginated(FeatSummary);
export type FeatListResponse = z.infer<typeof FeatListResponse>;
export const FeatDetailResponse = detail(Feat);
export type FeatDetailResponse = z.infer<typeof FeatDetailResponse>;

export const WeaponListResponse = paginated(WeaponSummary);
export type WeaponListResponse = z.infer<typeof WeaponListResponse>;
export const WeaponDetailResponse = detail(Weapon);
export type WeaponDetailResponse = z.infer<typeof WeaponDetailResponse>;

export const ArmorListResponse = paginated(Armor);
export type ArmorListResponse = z.infer<typeof ArmorListResponse>;
export const ArmorDetailResponse = detail(Armor);
export type ArmorDetailResponse = z.infer<typeof ArmorDetailResponse>;

export const MagicItemListResponse = paginated(MagicItemSummary);
export type MagicItemListResponse = z.infer<typeof MagicItemListResponse>;
export const MagicItemDetailResponse = detail(MagicItem);
export type MagicItemDetailResponse = z.infer<typeof MagicItemDetailResponse>;

export const RollTableListResponse = paginated(RollTableSummary);
export type RollTableListResponse = z.infer<typeof RollTableListResponse>;
export const RollTableDetailResponse = detail(RollTable);
export type RollTableDetailResponse = z.infer<typeof RollTableDetailResponse>;

export const RuleSectionListResponse = paginated(RuleSectionSummary);
export type RuleSectionListResponse = z.infer<typeof RuleSectionListResponse>;
export const RuleSectionDetailResponse = detail(RuleSection);
export type RuleSectionDetailResponse = z.infer<typeof RuleSectionDetailResponse>;

/** `GET /api/rules/documents`: every document with public records, for the credits page. */
export const DocumentListResponse = z.object({
  items: z.array(
    SourceDocument.extend({
      counts: z.object({
        spells: z.number().int(),
        monsters: z.number().int(),
        classes: z.number().int(),
        conditions: z.number().int(),
        species: z.number().int(),
        backgrounds: z.number().int(),
        feats: z.number().int(),
        weapons: z.number().int(),
        armor: z.number().int(),
        magic_items: z.number().int(),
        roll_tables: z.number().int(),
        rule_sections: z.number().int(),
      }),
    }),
  ),
});
export type DocumentListResponse = z.infer<typeof DocumentListResponse>;

/** `GET /api/rules/licenses`: full licence texts, matched to documents by licence key. */
export const LicenseListResponse = z.object({ items: z.array(LicenseText) });
export type LicenseListResponse = z.infer<typeof LicenseListResponse>;

/** Error body for 400 and 404. */
export const ApiError = z.object({
  error: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ApiError = z.infer<typeof ApiError>;
