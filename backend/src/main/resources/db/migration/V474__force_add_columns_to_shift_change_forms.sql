-- ==========================================
-- V474: Ensure columns exist and deduplicate SHIFT_CHANGE_FORMS
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
