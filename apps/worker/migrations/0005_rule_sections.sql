-- Rules sections (variant rules, sidebars, hazards, traps, diseases, poisons, lore). Same conventions as
-- the earlier migrations. `data` holds the full record as JSON (the RuleSection schema in packages/shared).
-- Open5e supplies none through the endpoints we import, so rows come from private books and homebrew.

CREATE TABLE rule_sections (
  id           TEXT PRIMARY KEY,
  document_key TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_search  TEXT NOT NULL,
  category     TEXT NOT NULL,
  data         TEXT NOT NULL,
  import_run   TEXT
);
CREATE INDEX rule_sections_document ON rule_sections (document_key);
CREATE INDEX rule_sections_name ON rule_sections (name COLLATE NOCASE);
CREATE INDEX rule_sections_category ON rule_sections (category);
