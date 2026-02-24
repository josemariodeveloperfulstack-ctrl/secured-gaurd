-- Módulo Fiscal: notas fiscais (PDF/XML) com nome do cliente e período
CREATE TABLE IF NOT EXISTS fiscal_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(500) NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_name_original VARCHAR(500),
    file_size BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_period ON fiscal_invoices(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_client ON fiscal_invoices(LOWER(client_name));
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_file_type ON fiscal_invoices(file_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_created_at ON fiscal_invoices(created_at);

-- Permissões Módulo Fiscal
INSERT INTO permissions (id, name, description)
SELECT gen_random_uuid(), 'FISCAL_READ', 'Ler Módulo Fiscal'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'FISCAL_READ');

INSERT INTO permissions (id, name, description)
SELECT gen_random_uuid(), 'FISCAL_WRITE', 'Gerenciar e importar notas fiscais'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'FISCAL_WRITE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'FINANCEIRO')
AND p.name IN ('FISCAL_READ', 'FISCAL_WRITE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
