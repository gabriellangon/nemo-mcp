-- ============================================================
-- Migration 001: Add multi-tenant support with user_id
-- ============================================================
-- Run this migration on existing databases to add user support
-- For new deployments, use db/schema.sql directly
-- ============================================================

BEGIN;

-- ============================================================
-- Step 1: Add user_id column to all tables (nullable first)
-- ============================================================

ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS user_id UUID;

-- ============================================================
-- Step 2: Handle existing data
-- ============================================================
-- Choose ONE of these options:

-- Option A: Assign existing rows to a specific user
-- Replace 'YOUR-USER-UUID-HERE' with an actual user UUID from auth.users
-- UPDATE knowledge SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;
-- UPDATE reminders SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;
-- UPDATE bookmarks SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;

-- Option B: Delete existing data (if starting fresh)
-- DELETE FROM knowledge WHERE user_id IS NULL;
-- DELETE FROM reminders WHERE user_id IS NULL;
-- DELETE FROM bookmarks WHERE user_id IS NULL;

-- ============================================================
-- Step 3: Make user_id NOT NULL (run AFTER handling existing data)
-- ============================================================
-- Uncomment these lines after you've handled existing data:

-- ALTER TABLE knowledge ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE reminders ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE bookmarks ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- Step 4: Add indexes for user-scoped queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- ============================================================
-- Step 5: Enable Row Level Security (Supabase only)
-- ============================================================

ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 6: Create RLS Policies (Supabase only)
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can insert own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can update own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can delete own knowledge" ON knowledge;

DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can update own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;

-- Knowledge policies
CREATE POLICY "Users can view own knowledge" ON knowledge
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own knowledge" ON knowledge
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own knowledge" ON knowledge
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own knowledge" ON knowledge
    FOR DELETE USING (user_id = auth.uid());

-- Reminders policies
CREATE POLICY "Users can view own reminders" ON reminders
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own reminders" ON reminders
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reminders" ON reminders
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reminders" ON reminders
    FOR DELETE USING (user_id = auth.uid());

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own bookmarks" ON bookmarks
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookmarks" ON bookmarks
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own bookmarks" ON bookmarks
    FOR DELETE USING (user_id = auth.uid());

COMMIT;

-- ============================================================
-- Notes:
-- ============================================================
-- 1. For self-hosted PostgreSQL without Supabase Auth:
--    - Skip RLS policies (steps 5-6)
--    - The application will handle user filtering
--
-- 2. For Supabase:
--    - RLS policies use auth.uid() which reads from the JWT token
--    - Service role key bypasses RLS (for admin operations)
--    - Anon key with user JWT respects RLS
-- ============================================================
