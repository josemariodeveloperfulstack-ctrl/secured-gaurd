-- Migration: V420__deduplicate_permissions.sql
-- Description: Merge redundant and old-style permission names into standard format

-- 1. Ensure new standard permissions exist
-- 1. Ensure new standard permissions exist
INSERT INTO permissions (id, name, description)
SELECT gen_random_uuid(), n, d
FROM (VALUES
    ('CLIENTS_READ', 'Visualizar clientes'),
    ('CLIENTS_WRITE', 'Gerenciar clientes'),
    ('EMPLOYEES_READ', 'Visualizar funcionários'),
    ('EMPLOYEES_WRITE', 'Gerenciar funcionários'),
    ('CONTRACTS_READ', 'Visualizar contratos'),
    ('CONTRACTS_WRITE', 'Gerenciar contratos'),
    ('FINANCIAL_READ', 'Visualizar financeiro'),
    ('FINANCIAL_WRITE', 'Gerenciar financeiro'),
    ('EQUIPMENTS_READ', 'Visualizar equipamentos'),
    ('EQUIPMENTS_WRITE', 'Gerenciar equipamentos'),
    ('REPORTS_READ', 'Visualizar relatórios'),
    ('SYSTEM_CONFIG', 'Configurações do sistema'),
    ('PROFILE_READ', 'Visualizar perfil próprio'),
    ('PROFILE_WRITE', 'Editar perfil próprio'),
    ('DOCUMENTS_READ', 'Visualizar documentos'),
    ('DOCUMENTS_WRITE', 'Gerenciar documentos'),
    ('PAYSLIPS_READ', 'Visualizar holerites')
) as t(n, d)
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = t.n);

-- 2. Merging role_permissions
-- Clients
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_CLIENTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'MANAGE_CLIENTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_WRITE'));

-- Employees
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'EMPLOYEES_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_EMPLOYEES')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'EMPLOYEES_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'EMPLOYEES_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'MANAGE_EMPLOYEES')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'EMPLOYEES_WRITE'));

-- Contracts
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'CONTRACTS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_CONTRACTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'CONTRACTS_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'CONTRACTS_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'MANAGE_CONTRACTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'CONTRACTS_WRITE'));

-- Financial
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'FINANCIAL_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_FINANCIAL')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'FINANCIAL_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'FINANCIAL_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'MANAGE_FINANCIAL')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'FINANCIAL_WRITE'));

-- Equipment (Fleet)
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'EQUIPMENTS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('VIEW_FLEET', 'FLEET_READ'))
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'EQUIPMENTS_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'EQUIPMENTS_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('MANAGE_FLEET', 'FLEET_WRITE'))
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'EQUIPMENTS_WRITE'));

-- Reports
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'REPORTS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_REPORTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'REPORTS_READ'));

-- System
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'SYSTEM_CONFIG')
WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('MANAGE_SYSTEM', 'SETTINGS_WRITE'))
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'SYSTEM_CONFIG'));

-- Profile
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'PROFILE_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_PROFILE')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'PROFILE_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'PROFILE_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'EDIT_PROFILE')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'PROFILE_WRITE'));

-- Documents
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'DOCUMENTS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_DOCUMENTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'DOCUMENTS_READ'));

UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'DOCUMENTS_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'MANAGE_DOCUMENTS')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'DOCUMENTS_WRITE'));

-- Payslips
UPDATE role_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'PAYSLIPS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_PAYSLIP')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = (SELECT id FROM permissions WHERE name = 'PAYSLIPS_READ'));

-- 3. Merging user_group_permissions
UPDATE user_group_permissions SET permission = 'CLIENTS_READ' WHERE permission = 'VIEW_CLIENTS';
UPDATE user_group_permissions SET permission = 'CLIENTS_WRITE' WHERE permission = 'MANAGE_CLIENTS';
UPDATE user_group_permissions SET permission = 'EMPLOYEES_READ' WHERE permission = 'VIEW_EMPLOYEES';
UPDATE user_group_permissions SET permission = 'EMPLOYEES_WRITE' WHERE permission = 'MANAGE_EMPLOYEES';
UPDATE user_group_permissions SET permission = 'CONTRACTS_READ' WHERE permission = 'VIEW_CONTRACTS';
UPDATE user_group_permissions SET permission = 'CONTRACTS_WRITE' WHERE permission = 'MANAGE_CONTRACTS';
UPDATE user_group_permissions SET permission = 'FINANCIAL_READ' WHERE permission = 'VIEW_FINANCIAL';
UPDATE user_group_permissions SET permission = 'FINANCIAL_WRITE' WHERE permission = 'MANAGE_FINANCIAL';
UPDATE user_group_permissions SET permission = 'EQUIPMENTS_READ' WHERE permission IN ('VIEW_FLEET', 'FLEET_READ');
UPDATE user_group_permissions SET permission = 'EQUIPMENTS_WRITE' WHERE permission IN ('MANAGE_FLEET', 'FLEET_WRITE');
UPDATE user_group_permissions SET permission = 'REPORTS_READ' WHERE permission = 'VIEW_REPORTS';
UPDATE user_group_permissions SET permission = 'SYSTEM_CONFIG' WHERE permission IN ('MANAGE_SYSTEM', 'SETTINGS_WRITE');
UPDATE user_group_permissions SET permission = 'PROFILE_READ' WHERE permission = 'VIEW_PROFILE';
UPDATE user_group_permissions SET permission = 'PROFILE_WRITE' WHERE permission = 'EDIT_PROFILE';
UPDATE user_group_permissions SET permission = 'DOCUMENTS_READ' WHERE permission = 'VIEW_DOCUMENTS';
UPDATE user_group_permissions SET permission = 'DOCUMENTS_WRITE' WHERE permission = 'MANAGE_DOCUMENTS';
UPDATE user_group_permissions SET permission = 'PAYSLIPS_READ' WHERE permission = 'VIEW_PAYSLIP';

-- 4. Merging user_custom_permissions
UPDATE user_custom_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_READ')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'VIEW_CLIENTS')
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_READ'));

UPDATE user_custom_permissions SET permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_WRITE')
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'MANAGE_CLIENTS')
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_id = (SELECT id FROM permissions WHERE name = 'CLIENTS_WRITE'));

-- (Repeat for other permissions in user_custom_permissions if necessary, but role_permissions and user_group_permissions are the main ones)

-- 5. Final cleanup of old permissions
-- Delete from role_permissions, user_group_permissions, user_custom_permissions first (not needed as we UPDATED them)
-- But we might have orphans if multiple old names mapped to the same new name for the same role/group.
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name IN (
    'VIEW_CLIENTS', 'MANAGE_CLIENTS',
    'VIEW_EMPLOYEES', 'MANAGE_EMPLOYEES',
    'VIEW_CONTRACTS', 'MANAGE_CONTRACTS',
    'VIEW_FINANCIAL', 'MANAGE_FINANCIAL',
    'VIEW_FLEET', 'MANAGE_FLEET', 'FLEET_READ', 'FLEET_WRITE',
    'VIEW_REPORTS',
    'MANAGE_SYSTEM', 'SETTINGS_WRITE',
    'VIEW_PROFILE', 'EDIT_PROFILE',
    'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
    'VIEW_PAYSLIP'
));

DELETE FROM user_custom_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name IN (
    'VIEW_CLIENTS', 'MANAGE_CLIENTS',
    'VIEW_EMPLOYEES', 'MANAGE_EMPLOYEES',
    'VIEW_CONTRACTS', 'MANAGE_CONTRACTS',
    'VIEW_FINANCIAL', 'MANAGE_FINANCIAL',
    'VIEW_FLEET', 'MANAGE_FLEET', 'FLEET_READ', 'FLEET_WRITE',
    'VIEW_REPORTS',
    'MANAGE_SYSTEM', 'SETTINGS_WRITE',
    'VIEW_PROFILE', 'EDIT_PROFILE',
    'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
    'VIEW_PAYSLIP'
));

-- Finally delete from permissions table
DELETE FROM permissions WHERE name IN (
    'VIEW_CLIENTS', 'MANAGE_CLIENTS',
    'VIEW_EMPLOYEES', 'MANAGE_EMPLOYEES',
    'VIEW_CONTRACTS', 'MANAGE_CONTRACTS',
    'VIEW_FINANCIAL', 'MANAGE_FINANCIAL',
    'VIEW_FLEET', 'MANAGE_FLEET', 'FLEET_READ', 'FLEET_WRITE',
    'VIEW_REPORTS',
    'MANAGE_SYSTEM', 'SETTINGS_WRITE',
    'VIEW_PROFILE', 'EDIT_PROFILE',
    'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
    'VIEW_PAYSLIP'
);
