-- Migration V1087: Add returned_date and return_reason fields to epi_delivery_form_items
ALTER TABLE epi_delivery_form_items ADD COLUMN IF NOT EXISTS returned_date DATE;
ALTER TABLE epi_delivery_form_items ADD COLUMN IF NOT EXISTS return_reason VARCHAR(255);
