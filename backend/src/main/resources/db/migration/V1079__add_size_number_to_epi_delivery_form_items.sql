-- Migration V1079: Adicionar coluna size_number na tabela epi_delivery_form_items
ALTER TABLE epi_delivery_form_items ADD COLUMN IF NOT EXISTS size_number VARCHAR(50);
