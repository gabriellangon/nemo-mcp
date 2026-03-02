-- ============================================================
-- Nemo — Database Schema
-- Compatible with both Supabase and self-hosted PostgreSQL
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search (already available in PostgreSQL)
-- The default full-text search config for notes is French.
-- If your content is mostly in another language, update the config here and in the adapters
-- so it matches your target language.
-- For Supabase: pgvector can be enabled later for semantic search

-- ============================================================
-- Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    source TEXT,  -- e.g. "claude-chat", "chatgpt", "manual"
    entry_type TEXT NOT NULL DEFAULT 'note'
        CHECK (entry_type IN ('conversation', 'note', 'idea', 'snippet', 'summary', 'resource')),
    metadata JSONB DEFAULT '{}',
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('french', title || ' ' || content)
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes
    USING GIN (search_vector);

-- Category index
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);

-- Tags index
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- ============================================================
-- Reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    is_done BOOLEAN DEFAULT FALSE,
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date) WHERE NOT is_done;

-- ============================================================
-- Bookmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_fts ON bookmarks
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Supabase RLS Policies (only applied if using Supabase)
-- Uncomment if deploying to Supabase with auth
-- ============================================================
-- ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all for authenticated users" ON notes
--     FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow all for authenticated users" ON reminders
--     FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow all for authenticated users" ON bookmarks
--     FOR ALL USING (auth.role() = 'authenticated');
