-- Migration: V418__add_comercial_role.sql
-- Description: Add COMERCIAL role and assign sales-related permissions

-- Insert COMERCIAL role if it doesn't exist
INSERT INTO roles (id, name, description)
SELECT gen_random_uuid(), 'COMERCIAL', 'Departamento Comercial'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'COMERCIAL');

-- Assign permissions to COMERCIAL role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'COMERCIAL'),
    id
FROM permissions
WHERE name IN (
    -- Clients
    'CLIENTS_READ', 'CLIENTS_CREATE', 'CLIENTS_WRITE',
    
    -- Leads
    'LEADS_READ', 'LEADS_CREATE', 'LEADS_UPDATE',
    
    -- Proposals
    'PROPOSALS_READ', 'PROPOSALS_CREATE', 'PROPOSALS_UPDATE', 'PROPOSALS_DELETE',
    
    -- Quotes
    'QUOTES_READ', 'QUOTES_CREATE', 'QUOTES_UPDATE', 'QUOTES_DELETE',
    
    -- Contracts
    'CONTRACTS_READ', 'CONTRACTS_CREATE', 'CONTRACTS_WRITE',
    
    -- General
    'DASHBOARD_READ',
    'REPORTS_READ'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = (SELECT id FROM roles WHERE name = 'COMERCIAL')
    AND rp.permission_id = permissions.id
);
