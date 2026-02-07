-- Garantir que a tabela contract_adjustments existe (caso a migração V424 não tenha sido executada)
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
