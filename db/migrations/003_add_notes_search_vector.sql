-- ============================================================
-- Migration 003: Add search_vector to notes for full-text search
-- ============================================================
-- Run this after migration 002 on existing databases
-- Default FTS config is French. Change it here if you want to target another language.
-- ============================================================

BEGIN;

ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('french', title || ' ' || content)
    ) STORED;

DROP INDEX IF EXISTS idx_notes_fts;

CREATE INDEX idx_notes_fts ON notes USING GIN (search_vector);

COMMIT;
