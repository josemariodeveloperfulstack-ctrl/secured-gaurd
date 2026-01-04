-- Criar tabela para EPIs padrão da primeira entrega por empresa
CREATE TABLE company_default_epis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    epi_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    ca_number VARCHAR(50),
    validity VARCHAR(100),
    observations TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_company_default_epis_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índice para melhor performance
CREATE INDEX idx_company_default_epis_company_id ON company_default_epis(company_id);
CREATE INDEX idx_company_default_epis_order ON company_default_epis(company_id, order_index);


