import {
  ArmorDetailResponse,
  ArmorListResponse,
  BackgroundDetailResponse,
  BackgroundListResponse,
  ClassDetailResponse,
  ClassListResponse,
  ConditionDetailResponse,
  ConditionListResponse,
  DocumentListResponse,
  FeatDetailResponse,
  FeatListResponse,
  ItemDetailResponse,
  ItemListResponse,
  ItemSetDetailResponse,
  ItemSetListResponse,
  LicenseListResponse,
  MagicItemDetailResponse,
  MagicItemListResponse,
  MonsterDetailResponse,
  MonsterListResponse,
  ReferenceDetailResponse,
  ReferenceListResponse,
  RollTableDetailResponse,
  RollTableListResponse,
  RuleChapterDetailResponse,
  RuleChapterListResponse,
  RuleDetailResponse,
  RuleListResponse,
  RuleSectionDetailResponse,
  RuleSectionListResponse,
  SpeciesDetailResponse,
  SpeciesListResponse,
  SpellDetailResponse,
  SpellListResponse,
  WeaponDetailResponse,
  WeaponListResponse,
} from "@table-forge/shared";
import { apiGet, type QueryParams } from "./client.js";

export type RuleKind = "spells" | "monsters" | "classes" | "conditions" | "species" | "backgrounds" | "feats" | "weapons" | "armor" | "magic_items" | "roll_tables" | "rule_sections" | "rule_chapters" | "rules" | "items" | "item_sets" | "reference_entries";

export const listSpells = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/spells", SpellListResponse, p, s);
export const getSpell = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/spells/${encodeURIComponent(id)}`, SpellDetailResponse, {}, s);
export const listMonsters = (p: QueryParams, s?: AbortSignal) =>
  apiGet("/api/rules/monsters", MonsterListResponse, p, s);
export const getMonster = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/monsters/${encodeURIComponent(id)}`, MonsterDetailResponse, {}, s);
export const listClasses = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/classes", ClassListResponse, p, s);
export const getClass = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/classes/${encodeURIComponent(id)}`, ClassDetailResponse, {}, s);
export const listConditions = (p: QueryParams, s?: AbortSignal) =>
  apiGet("/api/rules/conditions", ConditionListResponse, p, s);
export const getCondition = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/conditions/${encodeURIComponent(id)}`, ConditionDetailResponse, {}, s);

export const listSpecies = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/species", SpeciesListResponse, p, s);
export const getSpecies = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/species/${encodeURIComponent(id)}`, SpeciesDetailResponse, {}, s);
export const listBackgrounds = (p: QueryParams, s?: AbortSignal) =>
  apiGet("/api/rules/backgrounds", BackgroundListResponse, p, s);
export const getBackground = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/backgrounds/${encodeURIComponent(id)}`, BackgroundDetailResponse, {}, s);
export const listFeats = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/feats", FeatListResponse, p, s);
export const getFeat = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/feats/${encodeURIComponent(id)}`, FeatDetailResponse, {}, s);
export const listWeapons = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/weapons", WeaponListResponse, p, s);
export const getWeapon = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/weapons/${encodeURIComponent(id)}`, WeaponDetailResponse, {}, s);
export const listArmor = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/armor", ArmorListResponse, p, s);
export const getArmor = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/armor/${encodeURIComponent(id)}`, ArmorDetailResponse, {}, s);
export const listMagicItems = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/magic-items", MagicItemListResponse, p, s);
export const getMagicItem = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/magic-items/${encodeURIComponent(id)}`, MagicItemDetailResponse, {}, s);
export const listRollTables = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/roll-tables", RollTableListResponse, p, s);
export const getRollTable = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/roll-tables/${encodeURIComponent(id)}`, RollTableDetailResponse, {}, s);
export const listRuleSections = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/rule-sections", RuleSectionListResponse, p, s);
export const getRuleSection = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/rule-sections/${encodeURIComponent(id)}`, RuleSectionDetailResponse, {}, s);
export const listRuleChapters = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/rule-chapters", RuleChapterListResponse, p, s);
export const getRuleChapter = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/rule-chapters/${encodeURIComponent(id)}`, RuleChapterDetailResponse, {}, s);
export const listRules = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/rules", RuleListResponse, p, s);
export const getRule = (id: string, s?: AbortSignal) => apiGet(`/api/rules/rules/${encodeURIComponent(id)}`, RuleDetailResponse, {}, s);
export const listItems = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/items", ItemListResponse, p, s);
export const getItem = (id: string, s?: AbortSignal) => apiGet(`/api/rules/items/${encodeURIComponent(id)}`, ItemDetailResponse, {}, s);
export const listItemSets = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/item-sets", ItemSetListResponse, p, s);
export const getItemSet = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/item-sets/${encodeURIComponent(id)}`, ItemSetDetailResponse, {}, s);
export const listReference = (p: QueryParams, s?: AbortSignal) => apiGet("/api/rules/reference", ReferenceListResponse, p, s);
export const getReferenceEntry = (id: string, s?: AbortSignal) =>
  apiGet(`/api/rules/reference/${encodeURIComponent(id)}`, ReferenceDetailResponse, {}, s);

// Documents and licences depend on who is signed in (private books are listed for Access users only),
// so they are fetched fresh on every use and never held in a module-level cache that could outlive a
// change of identity. The responses are small.
export const getDocuments = (s?: AbortSignal) => apiGet("/api/rules/documents", DocumentListResponse, {}, s);
export const getLicenses = (s?: AbortSignal) => apiGet("/api/rules/licenses", LicenseListResponse, {}, s);
