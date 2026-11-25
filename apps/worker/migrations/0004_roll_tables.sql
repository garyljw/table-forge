-- Roll tables (treasure, encounters, NPCs, madness, trinkets, ...). Same conventions as the earlier
-- migrations: indexed columns drive list filters and `data` holds the full record as JSON (the RollTable
-- schema in packages/shared). Open5e supplies none, so rows come from private books and homebrew.

CREATE TABLE roll_tables (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  category     TEXT NOT NULL,
  dice         TEXT NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX roll_tables_document ON roll_tables (document_key);
CREATE INDEX roll_tables_name ON roll_tables (name COLLATE NOCASE);
CREATE INDEX roll_tables_category ON roll_tables (category);
