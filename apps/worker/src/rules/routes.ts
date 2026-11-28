import {
  Armor,
  ArmorDetailResponse,
  ArmorListQuery,
  ArmorListResponse,
  BackgroundDetailResponse,
  BackgroundListQuery,
  BackgroundListResponse,
  ClassDetailResponse,
  ClassListQuery,
  ClassListResponse,
  ClassSummary,
  ConditionDetailResponse,
  ConditionListQuery,
  ConditionListResponse,
  DocumentListResponse,
  FeatDetailResponse,
  FeatListQuery,
  FeatListResponse,
  ItemDetailResponse,
  ItemListQuery,
  ItemListResponse,
  ItemSetDetailResponse,
  ItemSetListQuery,
  ItemSetListResponse,
  WEAPON_ARMOR_CATEGORIES,
  LicenseListResponse,
  LicenseText,
  MagicItemDetailResponse,
  MagicItemListQuery,
  MagicItemListResponse,
  MonsterDetailResponse,
  MonsterListQuery,
  MonsterListResponse,
  RecordId,
  ReferenceDetailResponse,
  ReferenceEntry,
  ReferenceListQuery,
  ReferenceListResponse,
  Rule,
  RuleChapterDetailResponse,
  RuleChapterListQuery,
  RuleChapterListResponse,
  RuleDetailResponse,
  RuleListQuery,
  RuleListResponse,
  RollTableDetailResponse,
  RollTableListQuery,
  RollTableListResponse,
  RuleSectionDetailResponse,
  RuleSectionListQuery,
  RuleSectionListResponse,
  SourceDocument,
  SpeciesDetailResponse,
  SpeciesListQuery,
  SpeciesListResponse,
  SpeciesSummary,
  SpellDetailResponse,
  SpellListQuery,
  SpellListResponse,
  WeaponDetailResponse,
  WeaponListQuery,
  WeaponListResponse,
} from "@table-forge/shared";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { documentScopeFor } from "../auth/permissions.js";
import { pageEnvelope, selectChildren, selectDetail, selectDocuments, selectLicenses, selectPage, Where } from "./db.js";
import { notFound, parseQuery } from "./query.js";

/** `/api/rules/*`: the read-only rules browser. Mounted under `/api`, behind whatever auth middleware that gets. */
export const rulesRoutes = new Hono<AppEnv>();

// Responses depend on who is asking (private books are for signed-in users only), so no shared cache
// or browser cache may keep one. Set after the handler so errors and 404s carry it too.
rulesRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});

interface SpellRow {
  id: string;
  document_key: string;
  name: string;
  level: number;
  school: string;
  classes: string;
  concentration: number;
  ritual: number;
  casting_time: string;
  range_text: string;
}

rulesRoutes.get("/spells", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, SpellListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.level !== undefined) where.add("t.level = ?", q.level);
  if (q.school !== undefined) where.add("t.school = ?", q.school);
  if (q.class !== undefined) where.add("instr(t.classes, ?) > 0", `,${q.class},`);
  if (q.concentration !== undefined) where.add("t.concentration = ?", q.concentration ? 1 : 0);
  if (q.ritual !== undefined) where.add("t.ritual = ?", q.ritual ? 1 : 0);
  const { rows, total } = await selectPage<SpellRow>(
    c.env.DB,
    "spells",
    "t.id, t.document_key, t.name, t.level, t.school, t.classes, t.concentration, t.ritual, t.casting_time, t.range_text",
    where,
    q.page,
    q.pageSize,
  );
  const items = rows.map((r) => ({
    id: r.id,
    documentKey: r.document_key,
    name: r.name,
    level: r.level,
    school: r.school,
    classes: r.classes.split(",").filter((s) => s !== ""),
    concentration: r.concentration === 1,
    ritual: r.ritual === 1,
    castingTime: r.casting_time,
    range: r.range_text,
  }));
  return c.json(SpellListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/spells/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "spells", id.data) : null;
  if (!found) return notFound(c, "Spell");
  return c.json(SpellDetailResponse.parse(found));
});

interface MonsterRow {
  id: string;
  document_key: string;
  name: string;
  size: string;
  type: string;
  challenge_rating: number;
  armor_class: number;
  hit_points: number;
}

rulesRoutes.get("/monsters", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, MonsterListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.type !== undefined) where.add("t.type = ?", q.type);
  if (q.size !== undefined) where.add("t.size = ?", q.size);
  if (q.crMin !== undefined) where.add("t.challenge_rating >= ?", q.crMin);
  if (q.crMax !== undefined) where.add("t.challenge_rating <= ?", q.crMax);
  const { rows, total } = await selectPage<MonsterRow>(
    c.env.DB,
    "monsters",
    "t.id, t.document_key, t.name, t.size, t.type, t.challenge_rating, t.armor_class, t.hit_points",
    where,
    q.page,
    q.pageSize,
  );
  const items = rows.map((r) => ({
    id: r.id,
    documentKey: r.document_key,
    name: r.name,
    size: r.size,
    type: r.type,
    challengeRating: r.challenge_rating,
    armorClass: r.armor_class,
    hitPoints: r.hit_points,
  }));
  return c.json(MonsterListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/monsters/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "monsters", id.data) : null;
  if (!found) return notFound(c, "Monster");
  return c.json(MonsterDetailResponse.parse(found));
});

interface ClassRow {
  id: string;
  document_key: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  hit_dice: string | null;
  caster_type: string | null;
}

const CLASS_COLUMNS = "t.id, t.document_key, t.name, t.parent_id, t.parent_name, t.hit_dice, t.caster_type";

const classSummary = (r: ClassRow): ClassSummary => ({
  id: r.id,
  documentKey: r.document_key,
  name: r.name,
  // parent_name is set for every subclass; parent_id is null when the parent is not a stored class.
  parentClass: r.parent_name !== null ? { id: r.parent_id, name: r.parent_name } : null,
  hitDice: r.hit_dice,
  casterType: r.caster_type,
});

rulesRoutes.get("/classes", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, ClassListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.kind === "class") where.add("t.parent_name IS NULL");
  if (q.kind === "subclass") where.add("t.parent_name IS NOT NULL");
  if (q.parent !== undefined) where.add("t.parent_id = ?", q.parent);
  const { rows, total } = await selectPage<ClassRow>(c.env.DB, "classes", CLASS_COLUMNS, where, q.page, q.pageSize);
  return c.json(ClassListResponse.parse(pageEnvelope(rows.map(classSummary), total, q.page, q.pageSize)));
});

rulesRoutes.get("/classes/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "classes", id.data) : null;
  if (!id.success || !found) return notFound(c, "Class");
  const subclasses = await selectChildren<ClassRow>(c.env.DB, scope, "classes", CLASS_COLUMNS, id.data);
  return c.json(ClassDetailResponse.parse({ ...found, subclasses: subclasses.map(classSummary) }));
});

interface ConditionRow {
  id: string;
  document_key: string;
  name: string;
}

rulesRoutes.get("/conditions", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, ConditionListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  const { rows, total } = await selectPage<ConditionRow>(c.env.DB, "conditions", "t.id, t.document_key, t.name", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name }));
  return c.json(ConditionListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/conditions/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "conditions", id.data) : null;
  if (!found) return notFound(c, "Condition");
  return c.json(ConditionDetailResponse.parse(found));
});

interface SpeciesRow {
  id: string;
  document_key: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
}

const SPECIES_COLUMNS = "t.id, t.document_key, t.name, t.parent_id, t.parent_name";

const speciesSummary = (r: SpeciesRow): SpeciesSummary => ({
  id: r.id,
  documentKey: r.document_key,
  name: r.name,
  // parent_name is set for every subspecies; parent_id is null when the parent is not a stored species.
  parentSpecies: r.parent_name !== null ? { id: r.parent_id, name: r.parent_name } : null,
});

rulesRoutes.get("/species", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, SpeciesListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.kind === "species") where.add("t.parent_name IS NULL");
  if (q.kind === "subspecies") where.add("t.parent_name IS NOT NULL");
  if (q.parent !== undefined) where.add("t.parent_id = ?", q.parent);
  const { rows, total } = await selectPage<SpeciesRow>(c.env.DB, "species", SPECIES_COLUMNS, where, q.page, q.pageSize);
  return c.json(SpeciesListResponse.parse(pageEnvelope(rows.map(speciesSummary), total, q.page, q.pageSize)));
});

rulesRoutes.get("/species/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "species", id.data) : null;
  if (!id.success || !found) return notFound(c, "Species");
  const subspecies = await selectChildren<SpeciesRow>(c.env.DB, scope, "species", SPECIES_COLUMNS, id.data);
  return c.json(SpeciesDetailResponse.parse({ ...found, subspecies: subspecies.map(speciesSummary) }));
});

interface NamedRow {
  id: string;
  document_key: string;
  name: string;
}

rulesRoutes.get("/backgrounds", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, BackgroundListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  const { rows, total } = await selectPage<NamedRow>(c.env.DB, "backgrounds", "t.id, t.document_key, t.name", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name }));
  return c.json(BackgroundListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/backgrounds/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "backgrounds", id.data) : null;
  if (!found) return notFound(c, "Background");
  return c.json(BackgroundDetailResponse.parse(found));
});

rulesRoutes.get("/feats", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, FeatListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  const { rows, total } = await selectPage<NamedRow & { prerequisite: string | null }>(
    c.env.DB,
    "feats",
    "t.id, t.document_key, t.name, t.prerequisite",
    where,
    q.page,
    q.pageSize,
  );
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name, prerequisite: r.prerequisite }));
  return c.json(FeatListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/feats/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "feats", id.data) : null;
  if (!found) return notFound(c, "Feat");
  return c.json(FeatDetailResponse.parse(found));
});

interface WeaponRow extends NamedRow {
  category: string;
  kind: string;
  damage_dice: string;
  damage_type: string | null;
}

rulesRoutes.get("/weapons", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, WeaponListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.category !== undefined) where.add("t.category = ?", q.category);
  if (q.kind !== undefined) where.add("t.kind = ?", q.kind);
  if (q.damageType !== undefined) where.add("t.damage_type = ?", q.damageType);
  const { rows, total } = await selectPage<WeaponRow>(
    c.env.DB,
    "weapons",
    "t.id, t.document_key, t.name, t.category, t.kind, t.damage_dice, t.damage_type",
    where,
    q.page,
    q.pageSize,
  );
  const items = rows.map((r) => ({
    id: r.id,
    documentKey: r.document_key,
    name: r.name,
    category: r.category,
    kind: r.kind,
    damageDice: r.damage_dice,
    damageType: r.damage_type,
  }));
  return c.json(WeaponListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/weapons/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "weapons", id.data) : null;
  if (!found) return notFound(c, "Weapon");
  return c.json(WeaponDetailResponse.parse(found));
});

interface ArmorRow extends NamedRow {
  category: string;
  ac_base: number;
  adds_dex_modifier: number;
  dex_modifier_cap: number | null;
  strength_required: number | null;
  stealth_disadvantage: number;
  ac_display: string;
}

rulesRoutes.get("/armor", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, ArmorListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.category !== undefined) where.add("t.category = ?", q.category);
  const { rows, total } = await selectPage<ArmorRow>(
    c.env.DB,
    "armor",
    "t.id, t.document_key, t.name, t.category, t.ac_base, t.adds_dex_modifier, t.dex_modifier_cap, t.strength_required, t.stealth_disadvantage, t.ac_display",
    where,
    q.page,
    q.pageSize,
  );
  // One malformed row is left out of the list rather than failing the whole response.
  const items = rows.flatMap((r) => {
    const item = Armor.safeParse({
      id: r.id,
      documentKey: r.document_key,
      name: r.name,
      category: r.category,
      acBase: r.ac_base,
      addsDexModifier: r.adds_dex_modifier === 1,
      dexModifierCap: r.dex_modifier_cap,
      strengthRequired: r.strength_required,
      stealthDisadvantage: r.stealth_disadvantage === 1,
      acDisplay: r.ac_display,
    });
    return item.success ? [item.data] : [];
  });
  return c.json(ArmorListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/armor/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "armor", id.data) : null;
  if (!found) return notFound(c, "Armor");
  return c.json(ArmorDetailResponse.parse(found));
});

interface MagicItemRow extends NamedRow {
  type: string;
  rarity: string;
  requires_attunement: number;
}

rulesRoutes.get("/magic-items", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, MagicItemListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.type !== undefined) where.add("t.type = ?", q.type);
  if (q.rarity !== undefined) where.add("t.rarity = ?", q.rarity);
  if (q.attunement !== undefined) where.add("t.requires_attunement = ?", q.attunement ? 1 : 0);
  const { rows, total } = await selectPage<MagicItemRow>(
    c.env.DB,
    "magic_items",
    "t.id, t.document_key, t.name, t.type, t.rarity, t.requires_attunement",
    where,
    q.page,
    q.pageSize,
  );
  const items = rows.map((r) => ({
    id: r.id,
    documentKey: r.document_key,
    name: r.name,
    type: r.type,
    rarity: r.rarity,
    requiresAttunement: r.requires_attunement === 1,
  }));
  return c.json(MagicItemListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/magic-items/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "magic_items", id.data) : null;
  if (!found) return notFound(c, "Magic item");
  return c.json(MagicItemDetailResponse.parse(found));
});

interface RollTableRow extends NamedRow {
  category: string;
  dice: string;
}

rulesRoutes.get("/roll-tables", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, RollTableListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.category !== undefined) where.add("t.category = ?", q.category);
  const { rows, total } = await selectPage<RollTableRow>(c.env.DB, "roll_tables", "t.id, t.document_key, t.name, t.category, t.dice", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name, category: r.category, dice: r.dice }));
  return c.json(RollTableListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/roll-tables/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "roll_tables", id.data) : null;
  if (!found) return notFound(c, "Roll table");
  return c.json(RollTableDetailResponse.parse(found));
});

rulesRoutes.get("/rule-sections", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, RuleSectionListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.category !== undefined) where.add("t.category = ?", q.category);
  const { rows, total } = await selectPage<NamedRow & { category: string }>(c.env.DB, "rule_sections", "t.id, t.document_key, t.name, t.category", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name, category: r.category }));
  return c.json(RuleSectionListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/rule-sections/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "rule_sections", id.data) : null;
  if (!found) return notFound(c, "Rules section");
  return c.json(RuleSectionDetailResponse.parse(found));
});

rulesRoutes.get("/rule-chapters", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, RuleChapterListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  const { rows, total } = await selectPage<NamedRow>(c.env.DB, "rule_chapters", "t.id, t.document_key, t.name", where, q.page, q.pageSize, "chapter");
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name }));
  return c.json(RuleChapterListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/rule-chapters/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "rule_chapters", id.data) : null;
  if (!id.success || !found) return notFound(c, "Rules chapter");
  const rows = await selectChildren<{ data: string }>(c.env.DB, scope, "rules", "t.data AS data", id.data);
  // Like the other routes, a stored row that no longer fits its schema fails the request (a 500) instead of being hidden.
  const rules = rows.map((r) => Rule.parse(JSON.parse(r.data)));
  return c.json(RuleChapterDetailResponse.parse({ ...found, rules }));
});

interface RuleRow extends NamedRow {
  chapter_id: string | null;
  chapter_name: string | null;
}

rulesRoutes.get("/rules", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, RuleListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.chapter !== undefined) where.add("t.chapter_id = ?", q.chapter);
  const { rows, total } = await selectPage<RuleRow>(c.env.DB, "rules", "t.id, t.document_key, t.name, t.chapter_id, t.chapter_name", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name, chapterId: r.chapter_id, chapterName: r.chapter_name }));
  return c.json(RuleListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/rules/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "rules", id.data) : null;
  if (!found) return notFound(c, "Rule");
  return c.json(RuleDetailResponse.parse(found));
});

interface ItemRow extends NamedRow {
  category: string;
  cost_gp: number;
  weight_lb: number | null;
}

rulesRoutes.get("/items", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, ItemListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.category !== undefined) where.add("t.category = ?", q.category);
  if (q.gear === true) where.add(`t.category NOT IN (${WEAPON_ARMOR_CATEGORIES.map(() => "?").join(", ")})`, ...WEAPON_ARMOR_CATEGORIES);
  const { rows, total } = await selectPage<ItemRow>(c.env.DB, "items", "t.id, t.document_key, t.name, t.category, t.cost_gp, t.weight_lb", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name, category: r.category, costGp: r.cost_gp, weightLb: r.weight_lb }));
  return c.json(ItemListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/items/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "items", id.data) : null;
  if (!found) return notFound(c, "Item");
  return c.json(ItemDetailResponse.parse(found));
});

rulesRoutes.get("/item-sets", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, ItemSetListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  const { rows, total } = await selectPage<NamedRow & { item_count: number }>(c.env.DB, "item_sets", "t.id, t.document_key, t.name, t.item_count", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name, itemCount: r.item_count }));
  return c.json(ItemSetListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/item-sets/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "item_sets", id.data) : null;
  if (!found) return notFound(c, "Item set");
  return c.json(ItemSetDetailResponse.parse(found));
});

/** Reference entries are small, so the list carries the whole record (description included) and the page can show it inline. */
rulesRoutes.get("/reference", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const parsed = parseQuery(c, ReferenceListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where(scope).nameContains(q.q).document(q.document);
  if (q.kind !== undefined) where.add("t.kind = ?", q.kind);
  const { rows, total } = await selectPage<{ data: string }>(c.env.DB, "reference_entries", "t.data AS data", where, q.page, q.pageSize, "reference");
  // Like the other routes, a stored row that no longer fits its schema fails the request (a 500) instead of being hidden.
  const items = rows.map((r) => ReferenceEntry.parse(JSON.parse(r.data)));
  return c.json(ReferenceListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/reference/:id", async (c) => {
  const scope = documentScopeFor(c.get("identity"));
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, scope, "reference_entries", id.data) : null;
  if (!found) return notFound(c, "Reference entry");
  return c.json(ReferenceDetailResponse.parse(found));
});

/** Every document visible to the caller, with how many records of each type it supplies. For the credits page. */
rulesRoutes.get("/documents", async (c) => {
  const { docs, counts } = await selectDocuments(c.env.DB, documentScopeFor(c.get("identity")));
  const countFor = (index: number, key: string) =>
    Number((counts[index]?.results as { document_key: string; n: number }[] | undefined)?.find((r) => r.document_key === key)?.n ?? 0);
  const items = docs.map((row) => {
    const document = SourceDocument.parse(JSON.parse((row as { data: string }).data));
    return {
      ...document,
      // Order follows RULE_TABLES.
      counts: {
        spells: countFor(0, document.key),
        monsters: countFor(1, document.key),
        classes: countFor(2, document.key),
        conditions: countFor(3, document.key),
        species: countFor(4, document.key),
        backgrounds: countFor(5, document.key),
        feats: countFor(6, document.key),
        weapons: countFor(7, document.key),
        armor: countFor(8, document.key),
        magic_items: countFor(9, document.key),
        roll_tables: countFor(10, document.key),
        rule_sections: countFor(11, document.key),
        rule_chapters: countFor(12, document.key),
        rules: countFor(13, document.key),
        items: countFor(14, document.key),
        item_sets: countFor(15, document.key),
        reference_entries: countFor(16, document.key),
      },
    };
  });
  return c.json(DocumentListResponse.parse({ items }));
});

/** Full licence texts (OGL 1.0a, CC-BY-4.0, ...) for licences that a visible document uses. Documents refer to them by licence key. */
rulesRoutes.get("/licenses", async (c) => {
  const results = await selectLicenses(c.env.DB, documentScopeFor(c.get("identity")));
  return c.json(LicenseListResponse.parse({ items: results.map((r) => LicenseText.parse(r)) }));
});
