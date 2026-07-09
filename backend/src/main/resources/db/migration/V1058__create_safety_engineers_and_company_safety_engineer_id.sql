CREATE TABLE IF NOT EXISTS safety_engineers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    crea_number VARCHAR(50) NOT NULL,
    stamp_image_url VARCHAR(500),
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'companies'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'safety_engineers' AND constraint_name = 'fk_safety_engineers_company'
    ) THEN
        ALTER TABLE safety_engineers
        ADD CONSTRAINT fk_safety_engineers_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_safety_engineers_company_id
    ON safety_engineers(company_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'companies'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'safety_engineer_id'
    ) THEN
        ALTER TABLE companies
        ADD COLUMN safety_engineer_id UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_safety_engineer_id
    ON companies(safety_engineer_id);
