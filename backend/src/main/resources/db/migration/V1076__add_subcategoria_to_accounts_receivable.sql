-- V1076__add_subcategoria_to_accounts_receivable.sql
-- Description: Adiciona coluna subcategoria_id na tabela accounts_receivable
-- para vincular contas a receber ao Plano de Contas (subcategoria).

-- Adicionar coluna subcategoria_id (nullable) na tabela accounts_receivable
ALTER TABLE accounts_receivable
    ADD COLUMN IF NOT EXISTS subcategoria_id UUID;

COMMENT ON COLUMN accounts_receivable.subcategoria_id IS 'Referência à subcategoria do Plano de Contas';

-- Adicionar foreign key (apenas se a tabela de referência existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subcategoria') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_accounts_receivable_subcategoria'
              AND table_name = 'accounts_receivable'
        ) THEN
            ALTER TABLE accounts_receivable
                ADD CONSTRAINT fk_accounts_receivable_subcategoria
                FOREIGN KEY (subcategoria_id) REFERENCES subcategoria(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_subcategoria_id ON accounts_receivable(subcategoria_id);
