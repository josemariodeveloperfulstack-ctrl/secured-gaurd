-- Criação da tabela de manutenções de veículos
CREATE TABLE IF NOT EXISTS vehicle_maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    date DATE NOT NULL,
    maintenance_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    provider VARCHAR(200),
    mileage INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Adicionar colunas que podem estar faltando
DO $$
BEGIN
    -- Adicionar coluna status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_maintenances' AND column_name = 'status'
    ) THEN
        ALTER TABLE vehicle_maintenances ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED';
    END IF;
    
    -- Adicionar coluna priority se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_maintenances' AND column_name = 'priority'
    ) THEN
        ALTER TABLE vehicle_maintenances ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM';
    END IF;
END $$;

-- Índices para melhorar performance (apenas se as colunas existirem)
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_vehicle_id ON vehicle_maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_date ON vehicle_maintenances(date);

-- Criar índices condicionalmente
DO $$
BEGIN
    -- Índice para status se a coluna existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_maintenances' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_status ON vehicle_maintenances(status);
    END IF;
    
    -- Índice para priority se a coluna existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicle_maintenances' AND column_name = 'priority'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_priority ON vehicle_maintenances(priority);
    END IF;
END $$;
