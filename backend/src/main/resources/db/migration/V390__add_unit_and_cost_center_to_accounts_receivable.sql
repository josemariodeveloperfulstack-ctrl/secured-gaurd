-- Adicionar campos unit_id e centro_custo à tabela accounts_receivable
ALTER TABLE accounts_receivable 
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS centro_custo VARCHAR(100);

-- Adicionar foreign key para unit_id
ALTER TABLE accounts_receivable
ADD CONSTRAINT fk_accounts_receivable_unit 
FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;

-- Adicionar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_unit_id ON accounts_receivable(unit_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_centro_custo ON accounts_receivable(centro_custo);

-- Comentários para documentação
COMMENT ON COLUMN accounts_receivable.unit_id IS 'Referência à unidade/empresa';
COMMENT ON COLUMN accounts_receivable.centro_custo IS 'Centro de custo da conta a receber';

