-- =====================================================
-- V470: Fix duplicate rows in personal_protective_equipment
-- 
-- Root Cause: The table was likely created by Hibernate ddl-auto
-- before the Flyway migration ran, causing CREATE TABLE IF NOT EXISTS
-- to skip — leaving the table without proper UNIQUE/PK enforcement.
-- This resulted in multiple rows sharing the same id or name,
-- causing BatchedTooManyRowsAffectedException on updates.
-- =====================================================

-- Step 1: Remove duplicate rows by id, keeping only the most recently updated one
DELETE FROM personal_protective_equipment
WHERE ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM personal_protective_equipment
    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 2: Remove duplicate rows by name (after id dedup), keeping the most recent
DELETE FROM personal_protective_equipment
WHERE ctid NOT IN (
    SELECT DISTINCT ON (LOWER(name)) ctid
    FROM personal_protective_equipment
    ORDER BY LOWER(name), updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Ensure primary key constraint exists
DO $$
BEGIN
    -- Check if primary key exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'personal_protective_equipment'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE personal_protective_equipment ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Step 4: Ensure unique constraint on name exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'personal_protective_equipment'::regclass
        AND contype = 'u'
        AND conname LIKE '%name%'
    ) THEN
        ALTER TABLE personal_protective_equipment ADD CONSTRAINT uq_ppe_name UNIQUE (name);
    END IF;
END $$;
