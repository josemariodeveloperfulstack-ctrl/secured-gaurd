-- ==========================================
-- V475: Deduplicate and ensure PK on multiple tables
-- ==========================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'orders_of_service',
            'visit_controls',
            'rondas',
            'operational_occurrences',
            'epi_delivery_forms'
        ])
    LOOP
        -- Se a tabela existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            
            -- Disable triggers
            EXECUTE format('ALTER TABLE %I DISABLE TRIGGER ALL', tbl);
            
            -- Delete duplicates
            EXECUTE format('
                DELETE FROM %I
                WHERE ctid NOT IN (
                    SELECT DISTINCT ON (id) ctid
                    FROM %I
                    ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                )
            ', tbl, tbl);
            
            -- Re-enable triggers
            EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', tbl);
            
            -- Ensure primary key
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = tbl::regclass
                AND contype = 'p'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (id)', tbl);
            END IF;
            
        END IF;
    END LOOP;
END $$;
