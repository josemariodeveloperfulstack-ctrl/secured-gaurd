-- Campos por item: data e motivo de substituição (colunas do PDF da ficha)
ALTER TABLE epi_delivery_form_items
    ADD COLUMN IF NOT EXISTS substituted_date DATE;

ALTER TABLE epi_delivery_form_items
    ADD COLUMN IF NOT EXISTS replacement_reason VARCHAR(255);
