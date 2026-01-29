-- Increase emoji column length to support complex emojis and ensure the table exists
DO $$
BEGIN
    -- 1. Se a tabela message_reactions existe, apenas alteramos a coluna
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
        ALTER TABLE message_reactions ALTER COLUMN emoji TYPE VARCHAR(500);
        COMMENT ON COLUMN message_reactions.emoji IS 'Emoji da reação (suporta complexos)';
    
    -- 2. Se a tabela não existe mas chat_messages existe, criamos a tabela já com o tamanho correto
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        -- 2.1 Garantir que chat_messages tem PRIMARY KEY (evita erro de constraint em ambientes inconsistentes)
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'chat_messages'::regclass 
            AND contype = 'p'
        ) THEN
            ALTER TABLE chat_messages ADD PRIMARY KEY (id);
        END IF;

        -- 2.2 Garantir que users tem PRIMARY KEY
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'users'::regclass 
            AND contype = 'p'
        ) THEN
            ALTER TABLE users ADD PRIMARY KEY (id);
        END IF;

        CREATE TABLE message_reactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID NOT NULL,
            user_id UUID NOT NULL,
            emoji VARCHAR(500) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            
            CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
            CONSTRAINT fk_message_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT uk_message_reactions_user_emoji UNIQUE (message_id, user_id, emoji)
        );
        
        CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
        CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);
        
        COMMENT ON TABLE message_reactions IS 'Tabela para reações de mensagens de chat';
    END IF;
END $$;
