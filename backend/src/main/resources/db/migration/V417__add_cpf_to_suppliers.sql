-- Adiciona coluna CPF à tabela suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Cria índice para CPF
CREATE INDEX IF NOT EXISTS idx_suppliers_cpf ON suppliers(cpf);

-- Comentário explicativo
COMMENT ON COLUMN suppliers.cpf IS 'CPF do fornecedor pessoa física (formato: XXX.XXX.XXX-XX)';
