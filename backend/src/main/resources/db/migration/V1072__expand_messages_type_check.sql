-- Amplia chk_messages_type para os valores usados pelo enum MessageType no código.
-- Antes: apenas INDIVIDUAL, GROUP, GLOBAL
-- Isso quebrava criação de cliente (notifyNewClientOrWorkPost usa NOTIFICATION)
-- e rolava a transação inteira com HTTP 409.

ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_type;

ALTER TABLE messages
    ADD CONSTRAINT chk_messages_type
    CHECK (type IN ('INDIVIDUAL', 'GROUP', 'DEPARTMENT', 'GLOBAL', 'NOTIFICATION', 'EMAIL'));

COMMENT ON COLUMN messages.type IS 'Tipo da mensagem: INDIVIDUAL, GROUP, DEPARTMENT, GLOBAL, NOTIFICATION, EMAIL';
