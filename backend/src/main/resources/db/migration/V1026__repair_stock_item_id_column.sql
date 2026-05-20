-- Migração de segurança para garantir a existência da coluna stock_item_id
-- Esta coluna é essencial para a integração com o módulo de estoque nas fichas de EPI

DO $$
BEGIN
    -- Verifica se a tabela existe antes de tentar alterar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'epi_delivery_form_items') THEN
        -- Adiciona a coluna se ela não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'epi_delivery_form_items' 
                       AND column_name = 'stock_item_id') THEN
            
            ALTER TABLE epi_delivery_form_items ADD COLUMN stock_item_id UUID;
            
            -- Adiciona comentário para documentação
            COMMENT ON COLUMN epi_delivery_form_items.stock_item_id IS 'Referência ao item do estoque que foi entregue (opcional)';
            
            RAISE NOTICE 'Coluna stock_item_id adicionada com sucesso à tabela epi_delivery_form_items';
        ELSE
            RAISE NOTICE 'A coluna stock_item_id já existe na tabela epi_delivery_form_items';
        END IF;
    ELSE
        RAISE WARNING 'A tabela epi_delivery_form_items não foi encontrada. A migração V397 ou V1016 deve ter falhado.';
    END IF;
END $$;
