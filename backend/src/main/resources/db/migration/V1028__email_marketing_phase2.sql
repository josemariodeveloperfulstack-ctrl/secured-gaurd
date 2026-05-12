-- Fase 2 do e-mail marketing:
--   1. Estende email_campaigns com configurações ricas (template default, provider,
--      limites de envio, agendamento, status, autor).
--   2. Cria email_unsubscribes para descadastros e geração de links por token.
--   3. Estende email_campaign_recipients com origem (Lead/Importação/Manual),
--      vínculo opcional com lead e flag de Lead auto-criado.

-- 1. email_campaigns ---------------------------------------------------------
ALTER TABLE email_campaigns
    ADD COLUMN IF NOT EXISTS description         TEXT,
    ADD COLUMN IF NOT EXISTS default_template_id UUID,
    ADD COLUMN IF NOT EXISTS provider_type       VARCHAR(20)  NOT NULL DEFAULT 'SENDGRID',
    ADD COLUMN IF NOT EXISTS max_emails          INTEGER,
    ADD COLUMN IF NOT EXISTS daily_limit         INTEGER,
    ADD COLUMN IF NOT EXISTS hourly_limit        INTEGER,
    ADD COLUMN IF NOT EXISTS min_interval_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS scheduled_at        TIMESTAMP,
    ADD COLUMN IF NOT EXISTS status              VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS created_by_id       UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_email_campaigns_template'
    ) THEN
        ALTER TABLE email_campaigns
            ADD CONSTRAINT fk_email_campaigns_template
            FOREIGN KEY (default_template_id)
            REFERENCES email_templates(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_email_campaigns_created_by'
    ) THEN
        ALTER TABLE email_campaigns
            ADD CONSTRAINT fk_email_campaigns_created_by
            FOREIGN KEY (created_by_id)
            REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status        ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at  ON email_campaigns(scheduled_at);

-- 2. email_unsubscribes ------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(320) NOT NULL,
    token           VARCHAR(64)  UNIQUE,
    reason          TEXT,
    source          VARCHAR(40),
    campaign_id     UUID,
    unsubscribed_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_email_unsubscribes_email UNIQUE (email),
    CONSTRAINT fk_email_unsubscribes_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES email_campaigns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email_lower ON email_unsubscribes(lower(email));

-- 3. email_campaign_recipients ----------------------------------------------
ALTER TABLE email_campaign_recipients
    ADD COLUMN IF NOT EXISTS source_type        VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS lead_id            UUID,
    ADD COLUMN IF NOT EXISTS auto_lead_created  BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_email_recipient_lead'
    ) THEN
        ALTER TABLE email_campaign_recipients
            ADD CONSTRAINT fk_email_recipient_lead
            FOREIGN KEY (lead_id)
            REFERENCES leads(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_recipients_email_lower ON email_campaign_recipients(lower(email));
CREATE INDEX IF NOT EXISTS idx_email_recipients_lead_id     ON email_campaign_recipients(lead_id);
