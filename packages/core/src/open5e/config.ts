/**
 * Which Open5e documents we import. The one place to change the rule.
 *
 * Open5e v2 gives every document a `gamesystem`. We take the 2014 rules only
 * (`5e-2014`), which leaves out the 2024 SRD (`5e-2024`) and other systems such as
 * Level Up Advanced 5e (`a5e`).
 */
export const OPEN5E_API_BASE = "https://api.open5e.com/v2";

export const OPEN5E_CONTENT_RULES = {
  /** A document is included when its game system is in this list... */
  includeGameSystems: ["5e-2014"] as readonly string[],
  /** ...unless its key is here (for example an icon pack with no rules content)... */
  excludeDocuments: ["elderberry-inn-icons"] as readonly string[],
  /** ...or it is listed here, which includes it whatever its game system. */
  includeDocuments: [] as readonly string[],
};

export interface DocumentLike {
  key: string;
  gamesystem: { key: string };
}

export function isDocumentIncluded(doc: DocumentLike, rules = OPEN5E_CONTENT_RULES): boolean {
  if (rules.includeDocuments.includes(doc.key)) return true;
  if (rules.excludeDocuments.includes(doc.key)) return false;
  return rules.includeGameSystems.includes(doc.gamesystem.key);
}

/** Licence pages, for the credits. Keys are Open5e licence keys. */
export const LICENSE_URLS: Readonly<Record<string, string>> = {
  "cc-by-40": "https://creativecommons.org/licenses/by/4.0/",
  "ogl-10a": "https://opengamingfoundation.org/ogl.html",
  cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
};

/**
 * Attribution text that a licence requires word for word. Anything not listed here
 * gets a line built from Open5e's own document metadata.
 */
export const ATTRIBUTION_OVERRIDES: Readonly<Record<string, string>> = {
  "srd-2014":
    'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.',
};

/**
 * Item rarities (common to artifact) have no document in Open5e. They are the rarity scale from the
 * core rules, so they belong to Open5e's "5e Core Concepts" document, which supplies the other
 * core reference lists (sizes, languages, schools of magic).
 */
export const RARITY_DOCUMENT_KEY = "core";

/**
 * The 2014 SRD's rules chapters (Open5e ruleset keys) in the order the SRD book presents them.
 *
 * Open5e's `/rulesets/` has no order field and returns the chapters alphabetically, so the API order
 * cannot tell us the book order. A fixed list is the reliable source: it is reviewed by hand and does
 * not change when Open5e re-sorts. A chapter that is not listed (another document's, or one Open5e adds
 * later) sorts after these, by name.
 */
export const SRD_2014_CHAPTER_ORDER: readonly string[] = [
  "srd_leveling-up",
  "srd_multiclassing",
  "srd_races",
  "srd_backgrounds",
  "srd_alignment",
  "srd_languages",
  "srd_inspiration",
  "srd_coins",
  "srd_armor",
  "srd_weapons",
  "srd_tools",
  "srd_mounts-and-vehicles",
  "srd_trade-goods",
  "srd_expenses",
  "srd_selling-treasure",
  "srd_equipment-packs",
  "srd_feats",
  "srd_abilities",
  "srd_saving-throws",
  "srd_time",
  "srd_movement",
  "srd_environment",
  "srd_between-adventures",
  "srd_combat-sequence",
  "srd_actions-in-combat",
  "srd_attacking",
  "srd_cover",
  "srd_damage-and-healing",
  "srd_mounted-combat",
  "srd_underwater-combat",
  "srd_spellcasting",
  "srd_traps",
  "srd_diseases",
  "srd_madness",
  "srd_objects",
  "srd_poisons",
  "srd_planes",
  "srd_pantheons",
  "srd_magic-items",
  "srd_monsters",
  "srd_nonplayer-characters",
];

/** Sort index for a rules chapter: its position in the SRD order, or a shared last slot when unlisted. */
export function chapterSortIndex(chapterId: string): number {
  const at = SRD_2014_CHAPTER_ORDER.indexOf(chapterId);
  return at === -1 ? SRD_2014_CHAPTER_ORDER.length : at;
}
