-- Configurações SMTP globais (singleton lógico) — preparação para a Onda 3 do e-mail marketing.
-- A tabela email_unsubscribes já foi criada em V1028__email_marketing_phase2.sql.

CREATE TABLE IF NOT EXISTS smtp_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host            VARCHAR(255) NOT NULL,
    port            INTEGER      NOT NULL DEFAULT 587,
    username        VARCHAR(255),
    password_enc    TEXT,
    use_tls         BOOLEAN      NOT NULL DEFAULT TRUE,
    from_email      VARCHAR(320) NOT NULL,
    from_name       VARCHAR(255),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_test_at    TIMESTAMP,
    last_test_ok    BOOLEAN,
    last_test_error TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smtp_settings_active ON smtp_settings(is_active);
