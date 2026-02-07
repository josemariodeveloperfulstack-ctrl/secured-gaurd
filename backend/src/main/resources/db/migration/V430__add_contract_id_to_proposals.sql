-- Adiciona coluna contract_id na tabela proposals (bidirecional com contracts.proposal_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'contract_id') THEN
        ALTER TABLE proposals ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_contract_id ON proposals(contract_id);
