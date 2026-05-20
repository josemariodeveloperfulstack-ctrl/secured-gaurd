-- Migração para adicionar campos de assinatura e vínculo com estoque às fichas de EPI
-- Supersedes V1017 due to duplication conflict

DO $$
BEGIN
    -- Adicionar coluna signature se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'signature') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN signature TEXT;
    END IF;

    -- Adicionar coluna stock_requisition_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'stock_requisition_id') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN stock_requisition_id UUID;
    END IF;
END $$;
