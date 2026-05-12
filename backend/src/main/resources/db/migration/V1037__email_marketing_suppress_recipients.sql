-- Marca destinatários de campanha como excluídos do marketing após opt-out.
-- Data/hora em que o link de descadastro foi confirmado (clique no e-mail).
ALTER TABLE email_campaign_recipients
    ADD COLUMN IF NOT EXISTS email_marketing_suppressed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE email_unsubscribes
    ADD COLUMN IF NOT EXISTS unsubscribe_confirmed_at TIMESTAMP;

UPDATE email_unsubscribes
SET unsubscribe_confirmed_at = unsubscribed_at
WHERE is_unsubscribed = TRUE
  AND unsubscribe_confirmed_at IS NULL;

UPDATE email_campaign_recipients r
SET email_marketing_suppressed = TRUE
FROM email_unsubscribes u
WHERE lower(trim(r.email)) = lower(trim(u.email))
  AND u.is_unsubscribed = TRUE;
