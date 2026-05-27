-- Agente WhatsApp: conversas, histórico completo e modo IA vs humano

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    mode VARCHAR(30) NOT NULL DEFAULT 'AI_ACTIVE',
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_type VARCHAR(30),
    external_chat_id VARCHAR(120),
    contact_name VARCHAR(255),
    context_summary TEXT,
    ai_paused_at TIMESTAMP,
    last_message_at TIMESTAMP,
    last_inbound_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_whatsapp_conversations_phone UNIQUE (phone_number)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_mode ON whatsapp_conversations(mode);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead ON whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned ON whatsapp_conversations(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_msg ON whatsapp_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    direction VARCHAR(15) NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    external_message_id VARCHAR(120),
    provider_type VARCHAR(30),
    raw_payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id ON whatsapp_messages(external_message_id);

COMMENT ON TABLE whatsapp_conversations IS 'Thread WhatsApp por número — modo IA ou atendimento humano';
COMMENT ON COLUMN whatsapp_conversations.mode IS 'AI_ACTIVE ou HUMAN_HANDOFF';
COMMENT ON COLUMN whatsapp_conversations.context_summary IS 'Resumo rolling para memória da IA';
COMMENT ON TABLE whatsapp_messages IS 'Todas as mensagens (lead, IA, humano, sistema)';
