-- Tabela para mensagens fixadas
CREATE TABLE IF NOT EXISTS chat_message_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pin_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_pin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_pin_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX idx_pin_message ON chat_message_pins(message_id);
CREATE INDEX idx_pin_user ON chat_message_pins(user_id);

-- Tabela para mensagens favoritas
CREATE TABLE IF NOT EXISTS chat_message_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favorite_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_favorite_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX idx_favorite_message ON chat_message_favorites(message_id);
CREATE INDEX idx_favorite_user ON chat_message_favorites(user_id);

-- Tabela para denúncias de mensagens
CREATE TABLE IF NOT EXISTS chat_message_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    reporter_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_report_message ON chat_message_reports(message_id);
CREATE INDEX idx_report_reporter ON chat_message_reports(reporter_id);
CREATE INDEX idx_report_status ON chat_message_reports(status);

