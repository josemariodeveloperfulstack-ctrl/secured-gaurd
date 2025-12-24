-- Criar tabela de reações de mensagens
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_message_reactions_user_emoji UNIQUE (message_id, user_id, emoji)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);

-- Comentários
COMMENT ON TABLE message_reactions IS 'Tabela para armazenar reações (emoji) de mensagens de chat';
COMMENT ON COLUMN message_reactions.id IS 'ID único da reação';
COMMENT ON COLUMN message_reactions.message_id IS 'ID da mensagem reagida';
COMMENT ON COLUMN message_reactions.user_id IS 'ID do usuário que reagiu';
COMMENT ON COLUMN message_reactions.emoji IS 'Emoji da reação';
COMMENT ON COLUMN message_reactions.created_at IS 'Data e hora da reação';

