-- ============================================================
-- Migration 002: Rename knowledge table to notes
-- ============================================================
-- Run this on existing databases created before the note rename
-- ============================================================

BEGIN;

ALTER TABLE IF EXISTS knowledge RENAME TO notes;

ALTER INDEX IF EXISTS idx_knowledge_fts RENAME TO idx_notes_fts;
ALTER INDEX IF EXISTS idx_knowledge_category RENAME TO idx_notes_category;
ALTER INDEX IF EXISTS idx_knowledge_tags RENAME TO idx_notes_tags;
ALTER INDEX IF EXISTS idx_knowledge_user RENAME TO idx_notes_user;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'knowledge_updated_at') THEN
        EXECUTE 'ALTER TRIGGER knowledge_updated_at ON notes RENAME TO notes_updated_at';
    END IF;
END;
$$;

COMMIT;
