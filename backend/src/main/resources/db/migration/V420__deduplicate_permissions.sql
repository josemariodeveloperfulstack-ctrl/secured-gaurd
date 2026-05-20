-- 0. Ensure PKs exist (v421-style safety for inconsistent CI environments)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'permissions'::regclass AND contype = 'p') THEN
        ALTER TABLE permissions ADD PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'roles'::regclass AND contype = 'p') THEN
        ALTER TABLE roles ADD PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'role_permissions'::regclass AND contype = 'p') THEN
        -- Check if it has the columns before adding PK
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'role_id') THEN
             ALTER TABLE role_permissions ADD PRIMARY KEY (role_id, permission_id);
        END IF;
    END IF;
END $$;

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
DO $$
DECLARE
    mapping RECORD;
BEGIN
    FOR mapping IN SELECT * FROM (VALUES 
        ('VIEW_CLIENTS', 'CLIENTS_READ'),
        ('MANAGE_CLIENTS', 'CLIENTS_WRITE'),
        ('VIEW_EMPLOYEES', 'EMPLOYEES_READ'),
        ('MANAGE_EMPLOYEES', 'EMPLOYEES_WRITE'),
        ('VIEW_CONTRACTS', 'CONTRACTS_READ'),
        ('MANAGE_CONTRACTS', 'CONTRACTS_WRITE'),
        ('VIEW_FINANCIAL', 'FINANCIAL_READ'),
        ('MANAGE_FINANCIAL', 'FINANCIAL_WRITE'),
        ('VIEW_FLEET', 'EQUIPMENTS_READ'),
        ('FLEET_READ', 'EQUIPMENTS_READ'),
        ('MANAGE_FLEET', 'EQUIPMENTS_WRITE'),
        ('FLEET_WRITE', 'EQUIPMENTS_WRITE'),
        ('VIEW_REPORTS', 'REPORTS_READ'),
        ('MANAGE_SYSTEM', 'SYSTEM_CONFIG'),
        ('SETTINGS_WRITE', 'SYSTEM_CONFIG'),
        ('VIEW_PROFILE', 'PROFILE_READ'),
        ('EDIT_PROFILE', 'PROFILE_WRITE'),
        ('VIEW_DOCUMENTS', 'DOCUMENTS_READ'),
        ('MANAGE_DOCUMENTS', 'DOCUMENTS_WRITE'),
        ('VIEW_PAYSLIP', 'PAYSLIPS_READ')
    ) as t(old_p, new_p)
    LOOP
        -- Remove registros que já possuem a nova permissão para evitar conflito de UNIQUE CONSTRAINT no UPDATE
        DELETE FROM user_group_permissions 
        WHERE permission = mapping.new_p 
        AND group_id IN (SELECT group_id FROM user_group_permissions WHERE permission = mapping.old_p);
        
        -- Agora o UPDATE pode ser feito sem erro de duplicata
        UPDATE user_group_permissions SET permission = mapping.new_p WHERE permission = mapping.old_p;
    END LOOP;
END $$;


-- 4. Merging user_custom_permissions
UPDATE user_custom_permissions SET permission_key = 'CLIENTS_READ' WHERE permission_key = 'VIEW_CLIENTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'CLIENTS_READ');

UPDATE user_custom_permissions SET permission_key = 'CLIENTS_WRITE' WHERE permission_key = 'MANAGE_CLIENTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'CLIENTS_WRITE');

UPDATE user_custom_permissions SET permission_key = 'EMPLOYEES_READ' WHERE permission_key = 'VIEW_EMPLOYEES'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'EMPLOYEES_READ');

UPDATE user_custom_permissions SET permission_key = 'EMPLOYEES_WRITE' WHERE permission_key = 'MANAGE_EMPLOYEES'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'EMPLOYEES_WRITE');

UPDATE user_custom_permissions SET permission_key = 'CONTRACTS_READ' WHERE permission_key = 'VIEW_CONTRACTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'CONTRACTS_READ');

UPDATE user_custom_permissions SET permission_key = 'CONTRACTS_WRITE' WHERE permission_key = 'MANAGE_CONTRACTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'CONTRACTS_WRITE');

UPDATE user_custom_permissions SET permission_key = 'FINANCIAL_READ' WHERE permission_key = 'VIEW_FINANCIAL'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'FINANCIAL_READ');

UPDATE user_custom_permissions SET permission_key = 'FINANCIAL_WRITE' WHERE permission_key = 'MANAGE_FINANCIAL'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'FINANCIAL_WRITE');

UPDATE user_custom_permissions SET permission_key = 'EQUIPMENTS_READ' WHERE permission_key IN ('VIEW_FLEET', 'FLEET_READ')
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'EQUIPMENTS_READ');

UPDATE user_custom_permissions SET permission_key = 'EQUIPMENTS_WRITE' WHERE permission_key IN ('MANAGE_FLEET', 'FLEET_WRITE')
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'EQUIPMENTS_WRITE');

UPDATE user_custom_permissions SET permission_key = 'REPORTS_READ' WHERE permission_key = 'VIEW_REPORTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'REPORTS_READ');

UPDATE user_custom_permissions SET permission_key = 'SYSTEM_CONFIG' WHERE permission_key IN ('MANAGE_SYSTEM', 'SETTINGS_WRITE')
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'SYSTEM_CONFIG');

UPDATE user_custom_permissions SET permission_key = 'PROFILE_READ' WHERE permission_key = 'VIEW_PROFILE'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'PROFILE_READ');

UPDATE user_custom_permissions SET permission_key = 'PROFILE_WRITE' WHERE permission_key = 'EDIT_PROFILE'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'PROFILE_WRITE');

UPDATE user_custom_permissions SET permission_key = 'DOCUMENTS_READ' WHERE permission_key = 'VIEW_DOCUMENTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'DOCUMENTS_READ');

UPDATE user_custom_permissions SET permission_key = 'DOCUMENTS_WRITE' WHERE permission_key = 'MANAGE_DOCUMENTS'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'DOCUMENTS_WRITE');

UPDATE user_custom_permissions SET permission_key = 'PAYSLIPS_READ' WHERE permission_key = 'VIEW_PAYSLIP'
AND NOT EXISTS (SELECT 1 FROM user_custom_permissions ucp2 WHERE ucp2.user_id = user_custom_permissions.user_id AND ucp2.permission_key = 'PAYSLIPS_READ');

-- 5. Final cleanup of old permissions
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

DELETE FROM user_custom_permissions WHERE permission_key IN (
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
