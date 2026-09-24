-- Ordem estável dos itens na ficha de EPI (últimos cadastrados ficam abaixo).
ALTER TABLE epi_delivery_form_items
    ADD COLUMN IF NOT EXISTS line_order INTEGER;

-- Backfill: ordem atual aproximada por id (UUID) dentro de cada ficha.
WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY delivery_form_id ORDER BY id) - 1 AS rn
    FROM epi_delivery_form_items
)
UPDATE epi_delivery_form_items i
SET line_order = ordered.rn
FROM ordered
WHERE i.id = ordered.id
  AND i.line_order IS NULL;

UPDATE epi_delivery_form_items
SET line_order = 0
WHERE line_order IS NULL;

ALTER TABLE epi_delivery_form_items
    ALTER COLUMN line_order SET DEFAULT 0;

ALTER TABLE epi_delivery_form_items
    ALTER COLUMN line_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_epi_delivery_form_items_form_line_order
    ON epi_delivery_form_items (delivery_form_id, line_order);
