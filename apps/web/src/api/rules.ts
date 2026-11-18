import {
  ClassDetailResponse,
  ClassListResponse,
  ConditionDetailResponse,
  ConditionListResponse,
  DocumentListResponse,
  LicenseListResponse,
  MonsterDetailResponse,
  MonsterListResponse,
  SpellDetailResponse,
  SpellListResponse,
} from "@table-forge/shared";
import { apiGet, type QueryParams } from "./client.js";

export type RuleKind = "spells" | "monsters" | "classes" | "conditions";

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

// Documents and licences hardly ever change, so one fetch per page load is plenty.
let documentsPromise: ReturnType<typeof fetchDocuments> | null = null;
let licensesPromise: ReturnType<typeof fetchLicenses> | null = null;
const fetchDocuments = () => apiGet("/api/rules/documents", DocumentListResponse);
const fetchLicenses = () => apiGet("/api/rules/licenses", LicenseListResponse);

export function getDocuments() {
  if (documentsPromise === null) {
    const p = fetchDocuments();
    documentsPromise = p;
    // Forget a failed fetch so the next caller retries.
    p.catch(() => {
      if (documentsPromise === p) documentsPromise = null;
    });
  }
  return documentsPromise;
}

export function getLicenses() {
  if (licensesPromise === null) {
    const p = fetchLicenses();
    licensesPromise = p;
    p.catch(() => {
      if (licensesPromise === p) licensesPromise = null;
    });
  }
  return licensesPromise;
}

/** Forget cached documents and licences. For tests. */
export function resetRulesCache() {
  documentsPromise = null;
  licensesPromise = null;
}
