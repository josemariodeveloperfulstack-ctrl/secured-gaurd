-- Adiciona coluna stock_item_id à tabela epi_delivery_form_items
-- Mapeada na entidade EPIDeliveryFormItem.java

DO $$
BEGIN
    -- Adicionar coluna stock_item_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_form_items' AND column_name = 'stock_item_id') THEN
        ALTER TABLE epi_delivery_form_items ADD COLUMN stock_item_id UUID;
    END IF;
END $$;
