-- V99__create_plano_contas.sql
-- Plano de Contas hierárquico para Contas a Pagar

CREATE TABLE categoria_pai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE subcategoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_pai_id UUID NOT NULL REFERENCES categoria_pai(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    requer_vinculo_funcionario BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE invoices ADD COLUMN subcategoria_id UUID REFERENCES subcategoria(id);
ALTER TABLE invoices ADD COLUMN employee_id UUID REFERENCES employees(id);
