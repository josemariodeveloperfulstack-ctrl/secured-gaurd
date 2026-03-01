-- Aumentando o tamanho de TODAS as colunas que eram VARCHAR(20) na tabela employees e users
-- para prevenir o erro "valor é muito longo para tipo character varying(20)" durante uploads ou salva de cadastros

-- Tabela EMPLOYEES
ALTER TABLE employees ALTER COLUMN rg TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN phone TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN cnh_number TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN spouse_rg TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN spouse_phone TYPE VARCHAR(50);
-- status VARCHAR(20) check (ACTIVE, INACTIVE, etc) -> Não alteramos se é ENUM
ALTER TABLE employees ALTER COLUMN cep TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN empresa_cnpj TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN whatsapp TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN telefone_contato TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN dias_trabalho TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN agencia TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN conta_corrente TYPE VARCHAR(50);

-- Tabela USERS
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN whatsapp TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN two_factor_whatsapp TYPE VARCHAR(50);
