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
  LicenseListResponse,
  LicenseText,
  MagicItemDetailResponse,
  MagicItemListQuery,
  MagicItemListResponse,
  MonsterDetailResponse,
  MonsterListQuery,
  MonsterListResponse,
  RecordId,
  RollTableDetailResponse,
  RollTableListQuery,
  RollTableListResponse,
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
