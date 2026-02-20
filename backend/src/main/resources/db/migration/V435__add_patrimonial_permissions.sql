-- Inserir permissões do módulo Patrimonial
INSERT INTO permissions (id, name, description, category, created_at, updated_at)
SELECT gen_random_uuid(), 'PATRIMONIAL_READ', 'Visualizar bens patrimoniais', 'PATRIMONIAL', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'PATRIMONIAL_READ');

INSERT INTO permissions (id, name, description, category, created_at, updated_at)
SELECT gen_random_uuid(), 'PATRIMONIAL_WRITE', 'Gerenciar bens patrimoniais', 'PATRIMONIAL', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'PATRIMONIAL_WRITE');

INSERT INTO permissions (id, name, description, category, created_at, updated_at)
SELECT gen_random_uuid(), 'PATRIMONIAL_DELETE', 'Excluir bens patrimoniais', 'PATRIMONIAL', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'PATRIMONIAL_DELETE');

INSERT INTO permissions (id, name, description, category, created_at, updated_at)
SELECT gen_random_uuid(), 'PATRIMONIAL_AUDIT', 'Auditar movimentações patrimoniais', 'PATRIMONIAL', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'PATRIMONIAL_AUDIT');

-- Associar permissões ao ADMIN e SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')
  AND p.name IN ('PATRIMONIAL_READ', 'PATRIMONIAL_WRITE', 'PATRIMONIAL_DELETE', 'PATRIMONIAL_AUDIT')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
