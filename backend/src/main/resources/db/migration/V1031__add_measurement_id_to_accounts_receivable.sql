-- Vincula uma conta a receber a um Boletim de Medicao existente (medicoes ja cadastradas no modulo financeiro).
-- O campo measurement_number permanece como texto livre para casos legados/avulsos.

ALTER TABLE accounts_receivable
    ADD COLUMN IF NOT EXISTS measurement_id UUID;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'measurement_bulletins'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'accounts_receivable'
          AND constraint_name = 'fk_accounts_receivable_measurement'
    ) THEN
        EXECUTE 'ALTER TABLE accounts_receivable
                    ADD CONSTRAINT fk_accounts_receivable_measurement
                    FOREIGN KEY (measurement_id) REFERENCES measurement_bulletins(id)
                    ON DELETE SET NULL';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_measurement_id
    ON accounts_receivable (measurement_id);
