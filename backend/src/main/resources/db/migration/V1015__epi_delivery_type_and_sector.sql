-- Adicionar campo de tipo de entrega e setor do funcionário na ficha de entrega de EPI
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(30) DEFAULT 'PRIMEIRA_ENTREGA';
ALTER TABLE epi_delivery_forms ADD COLUMN IF NOT EXISTS employee_work_sector VARCHAR(500);

-- Atualizar fichas existentes para PRIMEIRA_ENTREGA
UPDATE epi_delivery_forms SET delivery_type = 'PRIMEIRA_ENTREGA' WHERE delivery_type IS NULL;
