-- The rest of Open5e's 2014 content: rulebook chapters and rules, ordinary equipment and item sets, and the
-- reference lists (abilities, skills, sizes, languages, ...). Same conventions as the earlier migrations:
-- indexed columns drive list filters, `data` holds the full record as JSON (shapes defined in packages/shared),
-- `document_key` points at `documents`, `import_run` marks the import that last wrote the row, and
-- `name_search` is the folded name.
--
-- `rule_sections` (0005) is unchanged: it is for variant rules, traps and sidebars from private books and
-- homebrew. `rule_chapters` and `rules` hold the SRD's own rules text, which has a chapter and an order.

CREATE TABLE rule_chapters (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  -- Position in the SRD's own chapter order (see SRD_2014_CHAPTER_ORDER in packages/core). Chapters not in
  -- that list (other documents) share the last slot and fall back to name order.
  sort_index   INTEGER NOT NULL DEFAULT 1000,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX rule_chapters_document ON rule_chapters (document_key);
CREATE INDEX rule_chapters_name ON rule_chapters (name COLLATE NOCASE);
CREATE INDEX rule_chapters_order ON rule_chapters (sort_index, name COLLATE NOCASE);

CREATE TABLE rules (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  chapter_id   TEXT,
  chapter_name TEXT,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  sort_index   INTEGER NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX rules_document ON rules (document_key);
CREATE INDEX rules_name ON rules (name COLLATE NOCASE);
CREATE INDEX rules_chapter ON rules (chapter_id, sort_index);

CREATE TABLE items (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  category     TEXT NOT NULL,
  cost_gp      REAL NOT NULL,
  weight_lb    REAL,
  weapon_id    TEXT,
  armor_id     TEXT,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX items_document ON items (document_key);
CREATE INDEX items_name ON items (name COLLATE NOCASE);
CREATE INDEX items_category ON items (category);

CREATE TABLE item_sets (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  item_count   INTEGER NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX item_sets_document ON item_sets (document_key);
CREATE INDEX item_sets_name ON item_sets (name COLLATE NOCASE);

CREATE TABLE reference_entries (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  -- The rank of a size or item rarity (smallest / commonest first); NULL for kinds with no rank.
  sort_rank    INTEGER,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX reference_entries_document ON reference_entries (document_key);
CREATE INDEX reference_entries_name ON reference_entries (name COLLATE NOCASE);
CREATE INDEX reference_entries_kind ON reference_entries (kind);
