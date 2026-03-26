-- Script para resolver roles duplicadas no banco de dados e garantir unicidade
-- Ambiente: CI / Produção

-- 1. Identificar roles duplicadas (mesmo nome)
-- SELECT name, COUNT(*) FROM roles GROUP BY name HAVING COUNT(*) > 1;

-- 2. Procedimento de merge (exemplo para ESTOQUE e COMPRAS)
-- Vamos criar uma tabela temporária para mapear IDs duplicados para o ID que será mantido

-- Criar tabela de mapeamento
CREATE TEMP TABLE role_mapping AS
WITH roles_ordered AS (
    SELECT id, name, 
           ROW_NUMBER() OVER(PARTITION BY name ORDER BY id ASC) as rn
    FROM roles
)
SELECT r1.id as old_id, r2.id as new_id, r1.name
FROM roles_ordered r1
JOIN (SELECT id, name FROM roles_ordered WHERE rn = 1) r2 ON r1.name = r2.name
WHERE r1.rn > 1;

-- 3. Atualizar associações de usuários (Removendo duplicatas nas associações)
-- Primeiro, deletar associações que existiriam em duplicata após o update
DELETE FROM user_roles
WHERE (user_id, role_id) IN (
    SELECT ur.user_id, m.old_id
    FROM user_roles ur
    JOIN role_mapping m ON ur.role_id = m.old_id
    WHERE EXISTS (
        SELECT 1 FROM user_roles ur2 
        WHERE ur2.user_id = ur.user_id AND ur2.role_id = m.new_id
    )
);

-- Agora atualizar as roles restantes dos usuários para o novo ID
UPDATE user_roles ur
SET role_id = m.new_id
FROM role_mapping m
WHERE ur.role_id = m.old_id;

-- 4. Atualizar permissões das roles
-- (Mesmo processo: deletar duplicatas e atualizar)
DELETE FROM role_permissions rp
WHERE (role_id, permission_id) IN (
    SELECT rp1.role_id, rp1.permission_id
    FROM role_permissions rp1
    JOIN role_mapping m ON rp1.role_id = m.old_id
    WHERE EXISTS (
        SELECT 1 FROM role_permissions rp2
        WHERE rp2.role_id = m.new_id AND rp2.permission_id = rp1.permission_id
    )
);

UPDATE role_permissions rp
SET role_id = m.new_id
FROM role_mapping m
WHERE rp.role_id = m.old_id;

-- 5. Deletar as roles duplicadas
DELETE FROM roles
WHERE id IN (SELECT old_id FROM role_mapping);

-- 6. Adicionar constraint de unicidade se não existir (PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_roles_name'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT uk_roles_name UNIQUE (name);
    END IF;
END $$;

-- Limpar
DROP TABLE role_mapping;

-- Verificar
SELECT name, COUNT(*) FROM roles GROUP BY name;
