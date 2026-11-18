-- Rules data: spells, monsters, classes, conditions.
--
-- One table per type. Indexed columns drive list filters; `data` holds the full
-- normalised record as JSON (the shape is defined by the Zod schemas in
-- packages/shared). Every record carries `document_key`, which points at `documents`.
-- Open5e, private book data and homebrew all live in these same tables; the
-- `documents` row says which (origin) and who may see it (visibility).
--
-- `import_run` marks which import run last wrote a row (null for rows not written by an
-- import). `name_search` is the name lowercased with accents removed (foldName in
-- packages/core), which is what name searches match against.

CREATE TABLE documents (
  key          TEXT PRIMARY KEY,
  origin       TEXT NOT NULL CHECK (origin IN ('open5e', 'private', 'homebrew')),
  visibility   TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL,
  game_system  TEXT NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);

-- Full licence texts (the OGL requires its text to be shown with the content).
CREATE TABLE licenses (
  key        TEXT PRIMARY KEY,
  origin     TEXT NOT NULL CHECK (origin IN ('open5e', 'private', 'homebrew')),
  name       TEXT NOT NULL,
  url        TEXT,
  text       TEXT NOT NULL,
  import_run TEXT
);

CREATE TABLE spells (
  id            TEXT PRIMARY KEY,
  document_key  TEXT NOT NULL,
  name          TEXT NOT NULL,
  name_search   TEXT NOT NULL,
  level         INTEGER NOT NULL,
  school        TEXT NOT NULL,
  -- Class slugs wrapped in commas, e.g. ',sorcerer,wizard,', so `LIKE '%,wizard,%'` matches exactly.
  classes       TEXT NOT NULL,
  concentration INTEGER NOT NULL,
  ritual        INTEGER NOT NULL,
  casting_time  TEXT NOT NULL,
  range_text    TEXT NOT NULL,
  data          TEXT NOT NULL,
  import_run    TEXT
);
CREATE INDEX spells_document ON spells (document_key);
CREATE INDEX spells_name ON spells (name COLLATE NOCASE);
CREATE INDEX spells_level ON spells (level);
CREATE INDEX spells_school ON spells (school);

CREATE TABLE monsters (
  id               TEXT PRIMARY KEY,
  document_key     TEXT NOT NULL,
  name             TEXT NOT NULL,
  name_search      TEXT NOT NULL,
  size             TEXT NOT NULL,
  type             TEXT NOT NULL,
  challenge_rating REAL NOT NULL,
  armor_class      INTEGER NOT NULL,
  hit_points       INTEGER NOT NULL,
  data             TEXT NOT NULL,
  import_run       TEXT
);
CREATE INDEX monsters_document ON monsters (document_key);
CREATE INDEX monsters_name ON monsters (name COLLATE NOCASE);
CREATE INDEX monsters_cr ON monsters (challenge_rating);
CREATE INDEX monsters_type ON monsters (type);
CREATE INDEX monsters_size ON monsters (size);

CREATE TABLE classes (
  id          TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name        TEXT NOT NULL,
  name_search TEXT NOT NULL,
  -- Set for subclasses (archetypes). Not a foreign key: the parent may come from another document.
  parent_id   TEXT,
  parent_name TEXT,
  hit_dice    TEXT,
  caster_type TEXT,
  data        TEXT NOT NULL,
  import_run  TEXT
);
CREATE INDEX classes_document ON classes (document_key);
CREATE INDEX classes_name ON classes (name COLLATE NOCASE);
CREATE INDEX classes_parent ON classes (parent_id);

CREATE TABLE conditions (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX conditions_document ON conditions (document_key);
CREATE INDEX conditions_name ON conditions (name COLLATE NOCASE);
