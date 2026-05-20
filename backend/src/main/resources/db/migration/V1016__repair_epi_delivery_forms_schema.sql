-- Migração de reparo para garantir que todos os campos necessários existem na tabela epi_delivery_forms
-- Esta migração resolve problemas de dessincronização onde colunas podem estar faltando

-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS epi_delivery_forms (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    company_id UUID NOT NULL,
    delivery_date DATE NOT NULL,
    responsible_employee_id UUID,
    observations TEXT,
    pdf_url VARCHAR(500),
    created_by_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Adicionar colunas faltantes se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'delivery_type') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN delivery_type VARCHAR(30) DEFAULT 'PRIMEIRA_ENTREGA';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'employee_work_sector') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN employee_work_sector VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_forms' AND column_name = 'pdf_url') THEN
        ALTER TABLE epi_delivery_forms ADD COLUMN pdf_url VARCHAR(500);
    END IF;
END $$;

-- 3. Atualizar registros existentes para garantir integridade
UPDATE epi_delivery_forms SET delivery_type = 'PRIMEIRA_ENTREGA' WHERE delivery_type IS NULL;

-- 4. Garantir que a tabela de itens existe e tem as colunas corretas
CREATE TABLE IF NOT EXISTS epi_delivery_form_items (
    id UUID PRIMARY KEY,
    delivery_form_id UUID NOT NULL,
    epi_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    ca VARCHAR(100),
    ca_name VARCHAR(255),
    validity_date DATE,
    uniform_type VARCHAR(50),
    uniform_piece VARCHAR(50),
    observations TEXT
);

-- 5. Adicionar ca_name se faltar (adicionado na V411 mas pode ter falhado)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epi_delivery_form_items' AND column_name = 'ca_name') THEN
        ALTER TABLE epi_delivery_form_items ADD COLUMN ca_name VARCHAR(255);
    END IF;
END $$;
