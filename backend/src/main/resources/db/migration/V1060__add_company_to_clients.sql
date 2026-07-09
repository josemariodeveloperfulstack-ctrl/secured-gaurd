ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS company_id UUID;

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_clients_company'
          AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients
            ADD CONSTRAINT fk_clients_company
            FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END $$;
