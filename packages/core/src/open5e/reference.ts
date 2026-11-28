import type { ReferenceEntry, ReferenceKind } from "@table-forge/shared";
import { RARITY_DOCUMENT_KEY } from "./config.js";
import type { RawReference } from "./raw.js";
import { cleanOrNull, cleanText, documentKeyOf } from "./text.js";

/** `chaotic-evil` becomes `Chaotic Evil`, for records Open5e gives no name. */
function nameFromKey(key: string): string {
  return key.split(/[-_]/).filter((w) => w !== "").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const ABILITIES = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
} as const;
type Abbreviation = keyof typeof ABILITIES;

function abbreviation(value: string | null | undefined, what: string): Abbreviation {
  const key = cleanText(value).toLowerCase();
  if (!(key in ABILITIES)) throw new Error(`unknown ${what} "${value ?? ""}"`);
  return key as Abbreviation;
}

/** Open5e writes `[None provided]` where it has no text. */
function describe(value: string | null | undefined): string {
  const text = cleanText(value);
  return text === "[None provided]" ? "" : text;
}

/** The kinds whose text Open5e keeps as one description per source document, as it does for conditions. */
const PER_DOCUMENT_DESCRIPTIONS: ReadonlySet<ReferenceKind> = new Set(["ability", "skill", "creature-type", "damage-type", "alignment"]);

function entryId(documentKey: string, kind: ReferenceKind, key: string): string {
  // Some keys already start with their document (`srd-2014_finesse-wp`); say it once.
  const slug = key.startsWith(`${documentKey}_`) ? key.slice(documentKey.length + 1) : key;
  return `${documentKey}_${kind}_${slug}`.toLowerCase();
}

/** The fields that depend on the kind. `description` and the shared fields are added by the caller. */
type KindFields = Record<string, unknown> & { kind: ReferenceKind };

function kindFields(kind: ReferenceKind, raw: RawReference): KindFields {
  switch (kind) {
    case "ability": {
      const abbr = abbreviation(raw.key, "ability");
      return { kind, abbreviation: abbr, abilityKey: ABILITIES[abbr] };
    }
    case "skill":
      return { kind, ability: ABILITIES[abbreviation(raw.ability, "skill ability")] };
    case "alignment":
      return {
        kind,
        shortName: cleanText(raw.short_name),
        morality: cleanText(raw.morality),
        societalAttitude: cleanText(raw.societal_attitude),
      };
    case "size":
      if (raw.distance_unit && raw.distance_unit !== "feet") throw new Error(`unexpected distance unit "${raw.distance_unit}"`);
      return { kind, rank: raw.rank, spaceFeet: raw.space_diameter, hitDie: cleanText(raw.suggested_hit_dice) };
    case "item-rarity":
      return { kind, rank: raw.rank };
    case "language": {
      const script = typeof raw.script_language === "string" ? raw.script_language : (raw.script_language?.key ?? null);
      return { kind, exotic: raw.is_exotic === true, secret: raw.is_secret === true, script: cleanOrNull(script) };
    }
    case "environment":
      return { kind, aquatic: raw.aquatic === true, planar: raw.planar === true, interior: raw.interior === true };
    case "weapon-property":
      return { kind, propertyType: cleanOrNull(raw.type) };
    case "creature-type":
    case "damage-type":
    case "spell-school":
    case "item-category":
      return { kind };
  }
}

/**
 * Normalises one Open5e reference record. Returns plain objects: the shared schema validates them.
 *
 * Kinds with a description per document (abilities, skills, creature types, damage types, alignments) make one
 * entry per description from an included document, owned by that document and so carrying its attribution, as
 * conditions do. A record with no description from an included document makes nothing.
 * Every other kind is one entry, owned by the record's own document. Item rarities have no document in
 * Open5e, so they belong to RARITY_DOCUMENT_KEY.
 */
export function normaliseReference(kind: ReferenceKind, raw: RawReference, isIncludedDocument: (documentKey: string) => boolean): ReferenceEntry[] {
  const fields = kindFields(kind, raw);
  const make = (documentKey: string, description: string): ReferenceEntry =>
    ({ id: entryId(documentKey, kind, raw.key), documentKey, dmOnly: false, name: cleanOrNull(raw.name) ?? nameFromKey(raw.key), description, ...fields }) as ReferenceEntry;
  if (PER_DOCUMENT_DESCRIPTIONS.has(kind)) {
    return (raw.descriptions ?? []).filter((d) => isIncludedDocument(d.document)).map((d) => make(d.document, describe(d.desc)));
  }
  const documentKey = documentKeyOf(raw.document) ?? (kind === "item-rarity" ? RARITY_DOCUMENT_KEY : null);
  if (documentKey === null) throw new Error(`${kind} "${raw.key}" has no document`);
  return [make(documentKey, describe(raw.desc))];
}
