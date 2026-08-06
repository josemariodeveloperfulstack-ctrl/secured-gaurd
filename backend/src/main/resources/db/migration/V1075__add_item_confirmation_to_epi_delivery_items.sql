-- Confirmação individual por item da ficha de entrega de EPI
-- (link público /epi-confirm/{token} por item + código WhatsApp de 6 dígitos)
ALTER TABLE epi_delivery_form_items
    ADD COLUMN IF NOT EXISTS confirmation_token UUID,
    ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(6),
    ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS signature_base64 TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_epi_items_confirmation_token
    ON epi_delivery_form_items (confirmation_token)
    WHERE confirmation_token IS NOT NULL;

COMMENT ON COLUMN epi_delivery_form_items.confirmation_token IS 'Token do link público de confirmação individual do item';
COMMENT ON COLUMN epi_delivery_form_items.confirmation_code IS 'Código de 6 dígitos enviado ao funcionário para este item';
