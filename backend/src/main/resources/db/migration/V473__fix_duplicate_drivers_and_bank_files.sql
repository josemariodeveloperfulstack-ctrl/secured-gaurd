-- =====================================================
-- V473: Fix duplicate rows in drivers and bank_files
-- 
-- Root Cause: The tables were likely created by Hibernate ddl-auto
-- before Flyway migration ran, causing CREATE TABLE IF NOT EXISTS
-- to skip — leaving the tables without proper UNIQUE/PK enforcement.
-- This resulted in multiple rows sharing the same id,
-- causing Hibernate ASSERT errors when performing findById or deletes.
-- =====================================================

-- ==========================================
-- SECTION 1: Deduplicate DRIVERS
-- ==========================================

-- Step 1: Remove duplicate rows by id, keeping only the most recently updated one
DELETE FROM drivers
WHERE ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM drivers
    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 2: Remove duplicate rows by license_number (CNH), keeping the most recent
DELETE FROM drivers
WHERE license_number IS NOT NULL AND license_number != '' AND ctid NOT IN (
    SELECT DISTINCT ON (LOWER(license_number)) ctid
    FROM drivers
    ORDER BY LOWER(license_number), updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Ensure primary key constraint exists for drivers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'drivers'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE drivers ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Step 4: Ensure unique constraint on license_number exists for drivers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'drivers'::regclass
        AND contype = 'u'
        AND conname LIKE '%license_number%'
    ) THEN
        ALTER TABLE drivers ADD CONSTRAINT uq_driver_license UNIQUE (license_number);
    END IF;
END $$;


-- ==========================================
-- SECTION 2: Deduplicate BANK_FILES
-- ==========================================

-- Step 1: Disable triggers temporarily on bank_files to prevent ON DELETE CASCADE from deleting bank_transactions
ALTER TABLE bank_files DISABLE TRIGGER ALL;

-- Step 2: Remove duplicate rows by id, keeping only the most recently updated one
DELETE FROM bank_files
WHERE ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM bank_files
    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Re-enable triggers on bank_files
ALTER TABLE bank_files ENABLE TRIGGER ALL;

-- Step 4: Ensure primary key constraint exists for bank_files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bank_files'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE bank_files ADD PRIMARY KEY (id);
    END IF;
END $$;


-- ==========================================
-- SECTION 3: Deduplicate BANKS
-- ==========================================

-- Step 1: Disable triggers temporarily on banks to prevent ON DELETE CASCADE
ALTER TABLE banks DISABLE TRIGGER ALL;

-- Step 2: Remove duplicate rows by id, keeping only the most recently updated one
DELETE FROM banks
WHERE ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM banks
    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Re-enable triggers on banks
ALTER TABLE banks ENABLE TRIGGER ALL;

-- Step 4: Ensure primary key constraint exists for banks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'banks'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE banks ADD PRIMARY KEY (id);
    END IF;
END $$;


-- ==========================================
-- SECTION 4: Adjust SHIFT_CHANGE_FORMS
-- ==========================================

-- Add requester_employee_id and replacing_employee_id columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shift_change_forms' 
        AND column_name = 'requester_employee_id'
    ) THEN
        ALTER TABLE shift_change_forms ADD COLUMN requester_employee_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shift_change_forms' 
        AND column_name = 'replacing_employee_id'
    ) THEN
        ALTER TABLE shift_change_forms ADD COLUMN replacing_employee_id UUID;
    END IF;
END $$;

-- Step 1: Disable triggers temporarily on shift_change_forms to prevent ON DELETE CASCADE
ALTER TABLE shift_change_forms DISABLE TRIGGER ALL;

-- Step 2: Remove duplicate rows by id, keeping only the most recently updated one
DELETE FROM shift_change_forms
WHERE ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM shift_change_forms
    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Re-enable triggers on shift_change_forms
ALTER TABLE shift_change_forms ENABLE TRIGGER ALL;

-- Step 4: Ensure primary key constraint exists for shift_change_forms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'shift_change_forms'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE shift_change_forms ADD PRIMARY KEY (id);
    END IF;
END $$;


-- ==========================================
-- SECTION 5: Deduplicate TRANSPORT_GUIDES
-- ==========================================

-- Step 1: Disable triggers temporarily on transport_guides to prevent ON DELETE CASCADE
ALTER TABLE transport_guides DISABLE TRIGGER ALL;

-- Step 2: Remove duplicate rows by id, keeping only the most recently updated one
DELETE FROM transport_guides
WHERE ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM transport_guides
    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Re-enable triggers on transport_guides
ALTER TABLE transport_guides ENABLE TRIGGER ALL;

-- Step 4: Ensure primary key constraint exists for transport_guides
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'transport_guides'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE transport_guides ADD PRIMARY KEY (id);
    END IF;
END $$;



