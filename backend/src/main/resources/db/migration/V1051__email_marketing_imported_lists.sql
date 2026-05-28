CREATE TABLE IF NOT EXISTS email_marketing_imported_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    source_type     VARCHAR(20) NOT NULL DEFAULT 'IMPORT',
    recipients      JSONB NOT NULL DEFAULT '[]'::jsonb,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_by_user_id UUID,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_marketing_imported_lists_updated
    ON email_marketing_imported_lists (updated_at DESC);
