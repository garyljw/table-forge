-- Character-creation options: species (races and subraces), backgrounds, feats, weapons, armour.
--
-- Same conventions as 0001_rules.sql: one table per type, indexed columns drive list filters,
-- `data` holds the full normalised record as JSON (shape defined by the Zod schemas in
-- packages/shared), `document_key` points at `documents` (whose origin and visibility decide
-- who may see the row), `import_run` marks the import that last wrote it, and `name_search` is
-- the folded name that searches match against.

CREATE TABLE species (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  -- Set for subspecies (subraces). Not a foreign key: the parent may come from another document,
  -- and parent_id is null when the parent is not a stored species (parent_name is still set).
  parent_id    TEXT,
  parent_name  TEXT,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX species_document ON species (document_key);
CREATE INDEX species_name ON species (name COLLATE NOCASE);
CREATE INDEX species_parent ON species (parent_id);

CREATE TABLE backgrounds (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX backgrounds_document ON backgrounds (document_key);
CREATE INDEX backgrounds_name ON backgrounds (name COLLATE NOCASE);

CREATE TABLE feats (
  id               TEXT PRIMARY KEY,
  document_key     TEXT NOT NULL,
  name             TEXT NOT NULL,
  name_search      TEXT NOT NULL,
  prerequisite     TEXT,
  data             TEXT NOT NULL,
  import_run       TEXT
);
CREATE INDEX feats_document ON feats (document_key);
CREATE INDEX feats_name ON feats (name COLLATE NOCASE);

CREATE TABLE weapons (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  category     TEXT NOT NULL,
  kind         TEXT NOT NULL,
  damage_dice  TEXT NOT NULL,
  -- Null when the source gives no damage type.
  damage_type  TEXT,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX weapons_document ON weapons (document_key);
CREATE INDEX weapons_name ON weapons (name COLLATE NOCASE);
CREATE INDEX weapons_category ON weapons (category);
CREATE INDEX weapons_damage_type ON weapons (damage_type);

CREATE TABLE armor (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  category     TEXT NOT NULL,
  ac_base      INTEGER NOT NULL,
  adds_dex_modifier    INTEGER NOT NULL,
  dex_modifier_cap     INTEGER,
  strength_required    INTEGER,
  stealth_disadvantage INTEGER NOT NULL,
  ac_display           TEXT NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX armor_document ON armor (document_key);
CREATE INDEX armor_name ON armor (name COLLATE NOCASE);
CREATE INDEX armor_category ON armor (category);
