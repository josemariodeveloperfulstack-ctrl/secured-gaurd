-- Migration V1081: Adiciona a coluna requires_ca na tabela stock_items para suporte à NR-6 (Grupo 1 EPI vs Grupo 2 Uniformes/Acessórios)
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS requires_ca BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN stock_items.requires_ca IS 'Indica se o item exige Certificado de Aprovação (CA) válido (NR-6 Grupo 1 EPI)';
