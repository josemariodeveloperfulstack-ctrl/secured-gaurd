-- Diferencia token de unsubscribe pendente de descadastro confirmado.
-- Sem isto, um token criado no primeiro envio poderia bloquear campanhas futuras
-- antes do destinatário clicar no link.
ALTER TABLE email_unsubscribes
    ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_confirmed_email
    ON email_unsubscribes(lower(email))
    WHERE is_unsubscribed = TRUE;
