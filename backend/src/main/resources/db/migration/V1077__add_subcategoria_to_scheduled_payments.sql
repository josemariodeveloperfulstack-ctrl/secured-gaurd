-- V1077__add_subcategoria_to_scheduled_payments.sql
-- Description: Adiciona coluna subcategoria_id na tabela scheduled_payments
-- para vincular pagamentos agendados ao Plano de Contas (subcategoria).

-- Adicionar coluna subcategoria_id (nullable) na tabela scheduled_payments
ALTER TABLE scheduled_payments
    ADD COLUMN IF NOT EXISTS subcategoria_id UUID;

COMMENT ON COLUMN scheduled_payments.subcategoria_id IS 'Referência à subcategoria do Plano de Contas';

-- Adicionar foreign key (apenas se a tabela de referência existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subcategoria') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_scheduled_payments_subcategoria'
              AND table_name = 'scheduled_payments'
        ) THEN
            ALTER TABLE scheduled_payments
                ADD CONSTRAINT fk_scheduled_payments_subcategoria
                FOREIGN KEY (subcategoria_id) REFERENCES subcategoria(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_subcategoria_id ON scheduled_payments(subcategoria_id);
