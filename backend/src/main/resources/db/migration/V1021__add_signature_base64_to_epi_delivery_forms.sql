-- Adiciona colunas signature_base64 e signature_type à tabela epi_delivery_forms
-- Mapeadas na entidade EPIDeliveryForm.java

DO $$
BEGIN
    -- Adicionar coluna signature_base64 se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'signature_base64') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN signature_base64 TEXT;
    END IF;

    -- Adicionar coluna signature_type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'signature_type') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN signature_type VARCHAR(50) DEFAULT 'ON_SCREEN';
    END IF;
END $$;
