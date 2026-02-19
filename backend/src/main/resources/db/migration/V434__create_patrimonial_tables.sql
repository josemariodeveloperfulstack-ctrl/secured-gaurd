-- Gestão Patrimonial: categorias, localizações e bens
CREATE TABLE IF NOT EXISTS patrimonial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_useful_life_years INTEGER,
    default_depreciation_rate_pct DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrimonial_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    address_or_room VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrimonial_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES patrimonial_categories(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES patrimonial_locations(id) ON DELETE SET NULL,
    acquisition_date DATE NOT NULL,
    acquisition_value DECIMAL(15,2) NOT NULL,
    useful_life_years INTEGER NOT NULL,
    residual_value_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'EM_USO',
    serial_number VARCHAR(100),
    invoice_number VARCHAR(100),
    responsible_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patrimonial_assets_category_id ON patrimonial_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_patrimonial_assets_location_id ON patrimonial_assets(location_id);
CREATE INDEX IF NOT EXISTS idx_patrimonial_assets_status ON patrimonial_assets(status);
CREATE INDEX IF NOT EXISTS idx_patrimonial_assets_code ON patrimonial_assets(code);
CREATE INDEX IF NOT EXISTS idx_patrimonial_assets_acquisition_date ON patrimonial_assets(acquisition_date);
CREATE INDEX IF NOT EXISTS idx_patrimonial_assets_responsible_employee_id ON patrimonial_assets(responsible_employee_id);

-- Permissões Gestão Patrimonial
INSERT INTO permissions (id, name, description) VALUES
(gen_random_uuid(), 'PATRIMONIAL_READ', 'Ler Gestão Patrimonial'),
(gen_random_uuid(), 'PATRIMONIAL_WRITE', 'Gerenciar Gestão Patrimonial');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'FINANCEIRO')
AND p.name IN ('PATRIMONIAL_READ', 'PATRIMONIAL_WRITE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
