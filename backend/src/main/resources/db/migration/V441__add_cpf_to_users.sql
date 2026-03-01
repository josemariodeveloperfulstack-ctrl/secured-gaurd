-- V302: Adiciona coluna CPF na tabela users
-- Permite vincular o usuário ao funcionário (employees.document = users.cpf)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Índice para busca rápida por CPF
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users (cpf);

-- Preenche automaticamente os usuários que já possuem CPF como username
-- (padrão: usuários criados via holerite têm CPF como username)
UPDATE users
SET cpf = REGEXP_REPLACE(username, '[^0-9]', '', 'g')
WHERE cpf IS NULL
  AND LENGTH(REGEXP_REPLACE(username, '[^0-9]', '', 'g')) = 11;
