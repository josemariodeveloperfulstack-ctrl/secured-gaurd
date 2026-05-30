-- Conteúdo da resposta do lead (SendGrid Inbound Parse)
ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS reply_subject VARCHAR(500),
    ADD COLUMN IF NOT EXISTS reply_text TEXT,
    ADD COLUMN IF NOT EXISTS reply_html TEXT;
