-- E-mails rejeitados/devolvidos no marketing: avaliação e bloqueio em novas campanhas/listas.
CREATE TABLE IF NOT EXISTS email_marketing_rejected_addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(320) NOT NULL,
    name            VARCHAR(500),
    reason          TEXT,
    campaign_id     UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    recipient_id    UUID REFERENCES email_campaign_recipients(id) ON DELETE SET NULL,
    lead_id         UUID,
    rejected_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_marketing_rejected_email_lower
    ON email_marketing_rejected_addresses (lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_email_marketing_rejected_campaign
    ON email_marketing_rejected_addresses (campaign_id, rejected_at DESC);

-- Backfill a partir de destinatários suprimidos com log de erro na campanha.
INSERT INTO email_marketing_rejected_addresses (email, name, reason, campaign_id, recipient_id, lead_id, rejected_at)
SELECT DISTINCT ON (lower(trim(r.email)))
    trim(r.email),
    r.name,
    COALESCE(l.bounce_reason, 'Rejeitado anteriormente'),
    r.campaign_id,
    r.id,
    r.lead_id,
    COALESCE(l.updated_at, r.created_at)
FROM email_campaign_recipients r
JOIN email_logs l ON l.recipient_id = r.id
WHERE r.email_marketing_suppressed = TRUE
  AND l.status IN ('BOUNCED', 'DROPPED')
  AND NOT EXISTS (
      SELECT 1 FROM email_marketing_rejected_addresses rej
      WHERE lower(trim(rej.email)) = lower(trim(r.email))
  )
ORDER BY lower(trim(r.email)), l.updated_at DESC;
