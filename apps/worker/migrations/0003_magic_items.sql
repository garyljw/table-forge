-- Magic items. Same conventions as 0001_rules.sql and 0002_character_options.sql: indexed
-- columns drive list filters, `data` holds the full record as JSON (shape defined by the
-- MagicItem schema in packages/shared), `document_key` points at `documents`, `import_run`
-- marks the import that last wrote the row, `name_search` is the folded name.

CREATE TABLE magic_items (
  id                  TEXT PRIMARY KEY,
  document_key        TEXT NOT NULL,
  name                TEXT NOT NULL,
  name_search         TEXT NOT NULL,
  type                TEXT NOT NULL,
  rarity              TEXT NOT NULL,
  requires_attunement INTEGER NOT NULL,
  data                TEXT NOT NULL,
  import_run          TEXT
);
CREATE INDEX magic_items_document ON magic_items (document_key);
CREATE INDEX magic_items_name ON magic_items (name COLLATE NOCASE);
CREATE INDEX magic_items_type ON magic_items (type);
CREATE INDEX magic_items_rarity ON magic_items (rarity);
CREATE INDEX magic_items_attunement ON magic_items (requires_attunement);
