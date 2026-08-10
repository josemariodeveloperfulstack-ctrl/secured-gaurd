-- V1078__add_accounts_receivable_id_to_scheduled_payments.sql
-- Description: Adiciona coluna accounts_receivable_id na tabela scheduled_payments
-- para rastrear a conta a receber de origem (herança automática da subcategoria).

-- Adicionar coluna accounts_receivable_id (nullable) na tabela scheduled_payments
ALTER TABLE scheduled_payments
    ADD COLUMN IF NOT EXISTS accounts_receivable_id UUID;

COMMENT ON COLUMN scheduled_payments.accounts_receivable_id IS 'Referência à conta a receber de origem (para herança automática de subcategoria)';

-- Índice para busca de agendamentos por conta de origem
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_accounts_receivable_id
    ON scheduled_payments (accounts_receivable_id);
