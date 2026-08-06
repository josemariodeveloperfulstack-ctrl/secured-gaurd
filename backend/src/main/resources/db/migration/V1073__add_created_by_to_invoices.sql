ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_id UUID;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_invoices_created_by' AND table_name = 'invoices'
        ) THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_created_by
                FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
