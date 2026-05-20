-- Campanhas de e-mail (SendGrid) + logs + anexos inbound + deduplicação de webhooks

CREATE TABLE IF NOT EXISTS email_campaigns (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(500) NOT NULL,
    template_id  VARCHAR(255),
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID         NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    email       VARCHAR(320) NOT NULL,
    name        VARCHAR(500),
    metadata    JSONB,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_campaign_recipient_ci
    ON email_campaign_recipients (campaign_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign
    ON email_campaign_recipients(campaign_id);

CREATE TABLE IF NOT EXISTS email_logs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id           UUID         NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_id          UUID         NOT NULL REFERENCES email_campaign_recipients(id) ON DELETE CASCADE,
    provider_message_id   VARCHAR(255),
    status                VARCHAR(40)  NOT NULL DEFAULT 'PENDING',
    sent_at               TIMESTAMP,
    delivered_at          TIMESTAMP,
    read_at               TIMESTAMP,
    clicked_at            TIMESTAMP,
    replied_at            TIMESTAMP,
    bounce_reason         TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_logs_provider_message
    ON email_logs(provider_message_id) WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_attachments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_log_id      UUID         NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
    file_url          VARCHAR(2000) NOT NULL,
    file_size         BIGINT       NOT NULL,
    content_type      VARCHAR(255),
    original_filename VARCHAR(500),
    scan_status       VARCHAR(40)  NOT NULL DEFAULT 'PENDING',
    created_at        TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_log ON email_attachments(email_log_id);

CREATE TABLE IF NOT EXISTS email_webhook_events (
    sg_event_id      VARCHAR(128) PRIMARY KEY,
    processed_at     TIMESTAMP    NOT NULL DEFAULT now(),
    payload_snippet  VARCHAR(500)
);
