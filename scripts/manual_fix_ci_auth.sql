-- =====================================================================
-- MANUAL FIX FOR CI ENVIRONMENT 403 ERRORS
-- Run this script on the CI VPS database to grant permissions to ESTOQUE
-- 1. Garante que os roles existam
INSERT INTO roles (id, name, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'ESTOQUE', now(), now()),
    (gen_random_uuid(), 'ALMOXARIFADO', now(), now())
ON CONFLICT (name) DO NOTHING;

-- 2. Atribui permissões básicas ao role ESTOQUE (ajuste os IDs conforme sua tabela permissions se necessário, 
-- mas o PermissionService.java já trata o mapeamento em tempo de execução se o role existir).
-- Nota: Esta parte é opcional se o backend for reiniciado após o patch do código, 
-- mas ajuda a garantir consistência imediata.

-- 3. Instrução para o usuário:
-- Execute este script no banco de dados do CI VPS:
-- docker exec -it secured-guard-db-ci psql -U secured_guard_ci -d secured_guard_ci -f /tmp/fix.sql
-- (Ou copie e cole no psql interativo))
INSERT INTO permissions (id, name, description)
VALUES 
(gen_random_uuid(), 'PURCHASE_REQUESTS_READ', 'Ler requisições de compra'),
(gen_random_uuid(), 'PURCHASE_REQUESTS_WRITE', 'Escrever requisições de compra'),
(gen_random_uuid(), 'EQUIPMENTS_READ', 'Ler equipamentos'),
(gen_random_uuid(), 'COMPANIES_READ', 'Ler empresas'),
(gen_random_uuid(), 'GROUPS_READ', 'Ler grupos'),
(gen_random_uuid(), 'TIME_RECORDS_READ', 'Ler registros de ponto'),
(gen_random_uuid(), 'STOCK_READ', 'Ler estoque'),
(gen_random_uuid(), 'STOCK_WRITE', 'Escrever estoque'),
(gen_random_uuid(), 'STOCK_CREATE', 'Criar estoque')
ON CONFLICT (name) DO NOTHING;

-- 3. Link Permissions to ESTOQUE role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ESTOQUE' 
AND p.name IN (
    'PURCHASE_REQUESTS_READ', 'PURCHASE_REQUESTS_WRITE', 
    'EQUIPMENTS_READ', 'COMPANIES_READ', 
    'GROUPS_READ', 'TIME_RECORDS_READ',
    'STOCK_READ'
)
ON CONFLICT DO NOTHING;

-- 4. Link same Permissions to ALMOXARIFADO role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ALMOXARIFADO' 
AND p.name IN (
    'PURCHASE_REQUESTS_READ', 'PURCHASE_REQUESTS_WRITE', 
    'EQUIPMENTS_READ', 'COMPANIES_READ', 
    'GROUPS_READ', 'TIME_RECORDS_READ',
    'STOCK_READ', 'STOCK_WRITE', 'STOCK_CREATE'
)
ON CONFLICT DO NOTHING;

-- 5. IMPORTANT: Ensure Felipe's user has the correct role record if needed
-- This assumes his role in the 'users' table is already 'ESTOQUE'.
-- If he still sees 403, he MUST Logoff and Login again to refresh the JWT.
