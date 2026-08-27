-- Migration V1085: Adiciona a coluna ca_number na tabela stock_items para armazenamento do número do CA do EPI
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS ca_number VARCHAR(50);
COMMENT ON COLUMN stock_items.ca_number IS 'Número do Certificado de Aprovação (CA) do item de estoque';
