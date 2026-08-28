-- Migração Flyway: Adicionar colunas refused_at e refusal_reason na tabela epi_delivery_forms
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS refused_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS refusal_reason TEXT;
