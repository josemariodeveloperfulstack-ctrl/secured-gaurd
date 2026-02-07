-- Garantir que a tabela contract_amendments existe (caso a migração V424 não tenha sido executada)
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
CREATE INDEX IF NOT EXISTS idx_contract_amendments_created_at ON contract_amendments(created_at);
