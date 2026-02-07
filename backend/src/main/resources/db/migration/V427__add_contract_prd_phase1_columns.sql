-- Colunas do PRD Fase 1 - Gestão de Contratos (que estavam faltando na tabela contracts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'contract_origin') THEN
        ALTER TABLE contracts ADD COLUMN contract_origin VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'contract_type') THEN
        ALTER TABLE contracts ADD COLUMN contract_type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'responsible_commercial_id') THEN
        ALTER TABLE contracts ADD COLUMN responsible_commercial_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'responsible_manager_id') THEN
        ALTER TABLE contracts ADD COLUMN responsible_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'proposal_id') THEN
        ALTER TABLE contracts ADD COLUMN proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'monthly_value') THEN
        ALTER TABLE contracts ADD COLUMN monthly_value NUMERIC(15, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'annual_value') THEN
        ALTER TABLE contracts ADD COLUMN annual_value NUMERIC(15, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'adjustment_type') THEN
        ALTER TABLE contracts ADD COLUMN adjustment_type VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'next_adjustment_date') THEN
        ALTER TABLE contracts ADD COLUMN next_adjustment_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'auto_renewal') THEN
        ALTER TABLE contracts ADD COLUMN auto_renewal BOOLEAN DEFAULT false;
    END IF;
END $$;
