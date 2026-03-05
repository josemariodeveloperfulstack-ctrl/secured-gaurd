-- V449: Adiciona colunas cpf e rg à tabela employees
-- Estas colunas foram adicionadas à entidade Employee mas estavam faltando no banco de dados

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(20),
    ADD COLUMN IF NOT EXISTS rg VARCHAR(30);

-- Adicionar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_rg ON employees(rg);

-- Preencher automaticamente a nova coluna cpf com o valor da coluna document (se document for um CPF)
UPDATE employees 
SET cpf = document 
WHERE cpf IS NULL AND document IS NOT NULL AND LENGTH(REGEXP_REPLACE(document, '[^0-9]', '', 'g')) = 11;

-- Preencher automaticamente a nova coluna rg com o valor de numero_rg
UPDATE employees 
SET rg = numero_rg 
WHERE rg IS NULL AND numero_rg IS NOT NULL;
