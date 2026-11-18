import {
  ClassDetailResponse,
  ClassListQuery,
  ClassListResponse,
  ClassSummary,
  ConditionDetailResponse,
  ConditionListQuery,
  ConditionListResponse,
  DocumentListResponse,
  LicenseListResponse,
  LicenseText,
  MonsterDetailResponse,
  MonsterListQuery,
  MonsterListResponse,
  RecordId,
  RULE_TABLES,
  SourceDocument,
  SpellDetailResponse,
  SpellListQuery,
  SpellListResponse,
} from "@table-forge/shared";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";
import { pageEnvelope, selectChildClasses, selectDetail, selectPage, Where } from "./db.js";
import { notFound, parseQuery } from "./query.js";

/** `/api/rules/*`: the read-only rules browser. Mounted under `/api`, behind whatever auth middleware that gets. */
export const rulesRoutes = new Hono<AppEnv>();

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
  const parsed = parseQuery(c, SpellListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where().nameContains(q.q).document(q.document);
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
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, "spells", id.data) : null;
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
  const parsed = parseQuery(c, MonsterListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where().nameContains(q.q).document(q.document);
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
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, "monsters", id.data) : null;
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
  const parsed = parseQuery(c, ClassListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where().nameContains(q.q).document(q.document);
  if (q.kind === "class") where.add("t.parent_name IS NULL");
  if (q.kind === "subclass") where.add("t.parent_name IS NOT NULL");
  if (q.parent !== undefined) where.add("t.parent_id = ?", q.parent);
  const { rows, total } = await selectPage<ClassRow>(c.env.DB, "classes", CLASS_COLUMNS, where, q.page, q.pageSize);
  return c.json(ClassListResponse.parse(pageEnvelope(rows.map(classSummary), total, q.page, q.pageSize)));
});

rulesRoutes.get("/classes/:id", async (c) => {
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, "classes", id.data) : null;
  if (!id.success || !found) return notFound(c, "Class");
  const subclasses = await selectChildClasses<ClassRow>(c.env.DB, CLASS_COLUMNS, id.data);
  return c.json(ClassDetailResponse.parse({ ...found, subclasses: subclasses.map(classSummary) }));
});

interface ConditionRow {
  id: string;
  document_key: string;
  name: string;
}

rulesRoutes.get("/conditions", async (c) => {
  const parsed = parseQuery(c, ConditionListQuery);
  if (!parsed.ok) return parsed.response;
  const q = parsed.query;
  const where = new Where().nameContains(q.q).document(q.document);
  const { rows, total } = await selectPage<ConditionRow>(c.env.DB, "conditions", "t.id, t.document_key, t.name", where, q.page, q.pageSize);
  const items = rows.map((r) => ({ id: r.id, documentKey: r.document_key, name: r.name }));
  return c.json(ConditionListResponse.parse(pageEnvelope(items, total, q.page, q.pageSize)));
});

rulesRoutes.get("/conditions/:id", async (c) => {
  const id = RecordId.safeParse(c.req.param("id"));
  const found = id.success ? await selectDetail(c.env.DB, "conditions", id.data) : null;
  if (!found) return notFound(c, "Condition");
  return c.json(ConditionDetailResponse.parse(found));
});

/** Every public document, with how many records of each type it supplies. For the credits page. */
rulesRoutes.get("/documents", async (c) => {
  const db = c.env.DB;
  const [docs, ...counts] = await db.batch([
    db.prepare("SELECT data FROM documents WHERE visibility = 'public' ORDER BY display_name COLLATE NOCASE, key"),
    ...RULE_TABLES.map((t) => db.prepare(`SELECT document_key, COUNT(*) AS n FROM ${t} GROUP BY document_key`)),
  ]);
  const countFor = (index: number, key: string) =>
    Number((counts[index]?.results as { document_key: string; n: number }[] | undefined)?.find((r) => r.document_key === key)?.n ?? 0);
  const items = (docs?.results ?? []).map((row) => {
    const document = SourceDocument.parse(JSON.parse((row as { data: string }).data));
    return {
      ...document,
      counts: { spells: countFor(0, document.key), monsters: countFor(1, document.key), classes: countFor(2, document.key), conditions: countFor(3, document.key) },
    };
  });
  return c.json(DocumentListResponse.parse({ items }));
});

/** Full licence texts (OGL 1.0a, CC-BY-4.0, ...) for licences that a public document uses. Documents refer to them by licence key. */
rulesRoutes.get("/licenses", async (c) => {
  const { results } = await c.env.DB.prepare(
      `SELECT l.key, l.name, l.url, l.text FROM licenses l WHERE EXISTS (
         SELECT 1 FROM documents d, json_each(d.data, '$.licenses') j
         WHERE d.visibility = 'public' AND json_extract(j.value, '$.key') = l.key
       ) ORDER BY l.name COLLATE NOCASE, l.key`,
    ).all();
  return c.json(LicenseListResponse.parse({ items: results.map((r) => LicenseText.parse(r)) }));
});
