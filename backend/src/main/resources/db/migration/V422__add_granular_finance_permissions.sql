-- V419__add_granular_finance_permissions.sql
-- Description: Add granular permissions for Finance module (Payable/Receivable)

-- Insert new permissions
INSERT INTO permissions (id, name, description) VALUES
(gen_random_uuid(), 'FINANCIAL_PAYABLE_READ', 'Ler Contas a Pagar'),
(gen_random_uuid(), 'FINANCIAL_PAYABLE_WRITE', 'Gerenciar Contas a Pagar'),
(gen_random_uuid(), 'FINANCIAL_RECEIVABLE_READ', 'Ler Contas a Receber'),
(gen_random_uuid(), 'FINANCIAL_RECEIVABLE_WRITE', 'Gerenciar Contas a Receber');

-- Assign new permissions to SUPER_ADMIN/ADMIN/FINANCEIRO automatically
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'FINANCEIRO')
AND p.name IN (
    'FINANCIAL_PAYABLE_READ', 
    'FINANCIAL_PAYABLE_WRITE', 
    'FINANCIAL_RECEIVABLE_READ', 
    'FINANCIAL_RECEIVABLE_WRITE'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
