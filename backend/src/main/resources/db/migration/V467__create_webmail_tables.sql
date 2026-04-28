-- =====================================================================
-- V467: Cria tabelas do módulo de Webmail Interno (Bridge)
-- tb_conta_email  → Contas de e-mail vinculadas a usuários
-- tb_email_cache  → Cache local de metadados (envelopes) de e-mails
-- =====================================================================

-- 1) Contas de e-mail
CREATE TABLE IF NOT EXISTS tb_conta_email (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email         VARCHAR(150) NOT NULL,
    imap_host     VARCHAR(150) NOT NULL,
    imap_port     INTEGER      NOT NULL DEFAULT 993,
    smtp_host     VARCHAR(150) NOT NULL,
    smtp_port     INTEGER      NOT NULL DEFAULT 587,
    senha_cifrada VARCHAR(500) NOT NULL,
    status        VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    last_sync_error VARCHAR(500),
    last_sync_date  TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conta_email_user   ON tb_conta_email(user_id);
CREATE INDEX IF NOT EXISTS idx_conta_email_status ON tb_conta_email(status);

-- 2) Cache de metadados de e-mails (envelopes)
CREATE TABLE IF NOT EXISTS tb_email_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_email_id  UUID         NOT NULL REFERENCES tb_conta_email(id) ON DELETE CASCADE,
    uid_provedor    BIGINT       NOT NULL,
    message_id      VARCHAR(255),
    folder          VARCHAR(150) NOT NULL DEFAULT 'INBOX',
    sender          VARCHAR(255) NOT NULL,
    subject         VARCHAR(500),
    received_date   TIMESTAMP,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    has_attachment   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_spam         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_cache_account ON tb_email_cache(conta_email_id);
CREATE INDEX IF NOT EXISTS idx_email_cache_uid     ON tb_email_cache(uid_provedor);
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_cache_account_uid ON tb_email_cache(conta_email_id, uid_provedor);
