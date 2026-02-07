-- Adicionar colunas SLA e Obrigações ao contrato (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'replacement_time_hours') THEN
        ALTER TABLE contracts ADD COLUMN replacement_time_hours INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'max_absence_minutes') THEN
        ALTER TABLE contracts ADD COLUMN max_absence_minutes INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'patrol_frequency') THEN
        ALTER TABLE contracts ADD COLUMN patrol_frequency VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'reports_required') THEN
        ALTER TABLE contracts ADD COLUMN reports_required TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'obligations_contractor') THEN
        ALTER TABLE contracts ADD COLUMN obligations_contractor TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'obligations_contracted') THEN
        ALTER TABLE contracts ADD COLUMN obligations_contracted TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'penalties') THEN
        ALTER TABLE contracts ADD COLUMN penalties TEXT;
    END IF;
END $$;

-- Tabela de Documentos do Contrato
CREATE TABLE IF NOT EXISTS contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    file_url VARCHAR(1000),
    file_name VARCHAR(255),
    signature_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    signed_at TIMESTAMP,
    signed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
