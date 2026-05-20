-- 1) Agendamento de e-mails
CREATE TABLE IF NOT EXISTS tb_scheduled_email (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES tb_conta_email(id) ON DELETE CASCADE,
    to_address      VARCHAR(255) NOT NULL,
    cc_address      VARCHAR(255),
    bcc_address     VARCHAR(255),
    subject         VARCHAR(500) NOT NULL,
    body            TEXT,
    scheduled_time  TIMESTAMP NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_email_account ON tb_scheduled_email(account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_email_status  ON tb_scheduled_email(status);

-- 2) Anexos de e-mails agendados
CREATE TABLE IF NOT EXISTS tb_scheduled_email_attachment (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_email_id  UUID NOT NULL REFERENCES tb_scheduled_email(id) ON DELETE CASCADE,
    filename            VARCHAR(255) NOT NULL,
    content_type        VARCHAR(150),
    content             BYTEA NOT NULL -- PostgreSQL equivalent for @Lob byte[]
);

-- 3) Regras de Automação de E-mail
CREATE TABLE IF NOT EXISTS tb_email_rule (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES tb_conta_email(id) ON DELETE CASCADE,
    condition_type  VARCHAR(50) NOT NULL, -- DOMAIN, SUBJECT, SENDER
    condition_value VARCHAR(255) NOT NULL,
    action_type     VARCHAR(50) NOT NULL, -- MOVE, DELETE
    action_value    VARCHAR(255),         -- Nome da pasta se for MOVE
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_rule_account ON tb_email_rule(account_id);
