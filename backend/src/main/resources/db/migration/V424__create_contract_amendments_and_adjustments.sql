-- Garantir que contracts e users têm PRIMARY KEY em id (fix para CI/ambientes com schema inconsistente)
DO $$
BEGIN
  -- contracts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = 'contracts' AND constraint_type = 'PRIMARY KEY'
     ) THEN
    ALTER TABLE contracts ADD PRIMARY KEY (id);
    RAISE NOTICE 'PRIMARY KEY adicionada à tabela contracts';
  END IF;
  -- users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = 'users' AND constraint_type = 'PRIMARY KEY'
     ) THEN
    ALTER TABLE users ADD PRIMARY KEY (id);
    RAISE NOTICE 'PRIMARY KEY adicionada à tabela users';
  END IF;
END $$;

-- Tabela de Aditivos de Contrato
CREATE TABLE IF NOT EXISTS contract_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    effective_date DATE,
    financial_impact NUMERIC(15, 2),
    approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract_id ON contract_amendments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_status ON contract_amendments(status);

-- Tabela de Histórico de Reajustes
CREATE TABLE IF NOT EXISTS contract_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) NOT NULL,
    previous_value NUMERIC(15, 2) NOT NULL,
    new_value NUMERIC(15, 2) NOT NULL,
    adjustment_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_adjustments_contract_id ON contract_adjustments(contract_id);
