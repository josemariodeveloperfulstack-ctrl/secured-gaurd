DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'termination_reason') THEN
        ALTER TABLE contracts ADD COLUMN termination_reason VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'termination_date') THEN
        ALTER TABLE contracts ADD COLUMN termination_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'termination_checklist') THEN
        ALTER TABLE contracts ADD COLUMN termination_checklist TEXT;
    END IF;
END $$;
