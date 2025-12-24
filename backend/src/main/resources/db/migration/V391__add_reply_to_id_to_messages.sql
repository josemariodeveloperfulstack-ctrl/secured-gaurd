-- Adicionar campo reply_to_id à tabela messages para suportar respostas
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID;

-- Adicionar foreign key constraint
ALTER TABLE messages
ADD CONSTRAINT fk_messages_reply_to 
FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Criar índice para melhor performance em consultas de respostas
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);

-- Comentário na coluna
COMMENT ON COLUMN messages.reply_to_id IS 'ID da mensagem original quando esta é uma resposta';

