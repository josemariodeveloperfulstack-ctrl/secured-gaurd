-- Gestão Patrimonial: categorias, localizações, bens, baixas, depreciação, manutenção

-- Criação da tabela de categorias (hierárquica)
CREATE TABLE IF NOT EXISTS asset_categories (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES asset_categories(id),
    depreciation_rate DECIMAL(5,2), -- Taxa anual de depreciação em %
    lifespan_years INTEGER, -- Vida útil em anos
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de localizações
CREATE TABLE IF NOT EXISTS asset_locations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de bens patrimoniais
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- Código de patrimônio / etiqueta
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    category_id UUID REFERENCES asset_categories(id),
    location_id UUID REFERENCES asset_locations(id),
    supplier_id UUID, -- Referência opcional para fornecedor
    
    acquisition_date DATE,
    acquisition_value DECIMAL(15,2),
    
    current_value DECIMAL(15,2), -- Valor residual atual
    status VARCHAR(50) NOT NULL, -- DISPONIVEL, EM_USO, MANUTENCAO, BAIXADO, EMPRESTADO
    
    serial_number VARCHAR(100),
    model VARCHAR(100),
    brand VARCHAR(100),
    
    invoice_number VARCHAR(50), -- Número da nota fiscal
    warranty_expiration DATE,
    
    responsible_employee_id UUID, -- Funcionário responsável (se houver)
    
    conditions VARCHAR(50), -- NOVO, BOM, REGULAR, RUIM, SUCATA
    
    notes TEXT,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tabela de movimentações/histórico do bem
CREATE TABLE IF NOT EXISTS asset_movements (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id),
    movement_type VARCHAR(50) NOT NULL, -- AQUISICAO, TRANSFERENCIA, BAIXA, MANUTENCAO, REAVALIACAO
    
    origin_location_id UUID REFERENCES asset_locations(id),
    target_location_id UUID REFERENCES asset_locations(id),
    
    responsible_id UUID, -- Quem autorizou/realizou
    movement_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    notes TEXT
);

-- Tabela de manutenções de bens
CREATE TABLE IF NOT EXISTS asset_maintenances (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id),
    
    maintenance_type VARCHAR(50) NOT NULL, -- PREVENTIVA, CORRETIVA
    status VARCHAR(50) NOT NULL, -- AGENDADA, EM_ANDAMENTO, CONCLUIDA, CANCELADA
    
    scheduled_date DATE,
    completion_date DATE,
    
    cost DECIMAL(15,2),
    vendor_name VARCHAR(255), -- Quem realizou a manutenção
    
    description TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tabela de depreciação mensal (histórico de cálculo)
CREATE TABLE IF NOT EXISTS asset_depreciations (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id),
    calculation_date DATE NOT NULL,
    
    previous_value DECIMAL(15,2),
    depreciation_value DECIMAL(15,2),
    current_value DECIMAL(15,2),
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_movements_asset ON asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenances_asset ON asset_maintenances(asset_id);
