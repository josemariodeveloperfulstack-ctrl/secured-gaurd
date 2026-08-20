-- V1081: Adicionar campo work_sector na tabela invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS work_sector VARCHAR(150);
