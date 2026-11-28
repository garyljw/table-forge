-- Book ownership and SRD masking.
--
-- book_owners: which signed-in people may read which private book. A private document is readable
-- only by a verified user with a row here for its key. Emails are stored trimmed and lowercased.
-- Rows are written only by the admin API (the app owner ticks "this person owns this book").
-- users: people who have signed in (written by GET /api/me), so the admin page can list them.
--
-- supersedes_id: the id of the public (SRD) record a book record replaces. For a reader who can see
-- the book record, the replaced record is hidden. Null for almost every row.

CREATE TABLE book_owners (
  email        TEXT NOT NULL,
  document_key TEXT NOT NULL,
  granted_at   TEXT NOT NULL,
  PRIMARY KEY (email, document_key)
);

CREATE TABLE users (
  email      TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen  TEXT NOT NULL
);

ALTER TABLE spells ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_spells_supersedes ON spells(supersedes_id);
ALTER TABLE monsters ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_monsters_supersedes ON monsters(supersedes_id);
ALTER TABLE classes ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_classes_supersedes ON classes(supersedes_id);
ALTER TABLE conditions ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_conditions_supersedes ON conditions(supersedes_id);
ALTER TABLE species ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_species_supersedes ON species(supersedes_id);
ALTER TABLE backgrounds ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_backgrounds_supersedes ON backgrounds(supersedes_id);
ALTER TABLE feats ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_feats_supersedes ON feats(supersedes_id);
ALTER TABLE weapons ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_weapons_supersedes ON weapons(supersedes_id);
ALTER TABLE armor ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_armor_supersedes ON armor(supersedes_id);
ALTER TABLE magic_items ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_magic_items_supersedes ON magic_items(supersedes_id);
ALTER TABLE roll_tables ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_roll_tables_supersedes ON roll_tables(supersedes_id);
ALTER TABLE rule_sections ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_rule_sections_supersedes ON rule_sections(supersedes_id);
ALTER TABLE rule_chapters ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_rule_chapters_supersedes ON rule_chapters(supersedes_id);
ALTER TABLE rules ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_rules_supersedes ON rules(supersedes_id);
ALTER TABLE items ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_items_supersedes ON items(supersedes_id);
ALTER TABLE item_sets ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_item_sets_supersedes ON item_sets(supersedes_id);
ALTER TABLE reference_entries ADD COLUMN supersedes_id TEXT;
CREATE INDEX idx_reference_entries_supersedes ON reference_entries(supersedes_id);
