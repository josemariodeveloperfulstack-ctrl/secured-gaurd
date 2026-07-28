-- Valor unitário anterior (último cadastro) para histórico e variação de preço
ALTER TABLE stock_items
    ADD COLUMN IF NOT EXISTS previous_unit_cost NUMERIC(10, 2);

COMMENT ON COLUMN stock_items.previous_unit_cost IS 'Último valor unitário cadastrado antes da atualização atual';
COMMENT ON COLUMN stock_items.unit_cost IS 'Valor unitário atual do item';
