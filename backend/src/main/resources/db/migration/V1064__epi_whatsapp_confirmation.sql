-- Confirmação de recebimento de EPI via WhatsApp (link + código)
ALTER TABLE epi_delivery_forms
    ADD COLUMN IF NOT EXISTS confirmation_token UUID,
    ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(6),
    ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS signature_origin VARCHAR(40),
    ADD COLUMN IF NOT EXISTS audit_ip VARCHAR(80),
    ADD COLUMN IF NOT EXISTS audit_user_agent VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS idx_epi_forms_confirmation_token
    ON epi_delivery_forms (confirmation_token)
    WHERE confirmation_token IS NOT NULL;

COMMENT ON COLUMN epi_delivery_forms.confirmation_token IS 'Token do link público de confirmação WhatsApp';
COMMENT ON COLUMN epi_delivery_forms.confirmation_code IS 'Código de 6 dígitos enviado ao funcionário';
