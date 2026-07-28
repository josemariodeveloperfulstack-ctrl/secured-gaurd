-- Migration: V1062__add_subcategoria_and_employee_to_invoices.sql
-- Description: Adiciona colunas subcategoria_id e employee_id na tabela invoices
-- para vincular faturas/despesas ao Plano de Contas (subcategoria) e a funcionários.

-- Adicionar coluna subcategoria_id (nullable) na tabela invoices
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS subcategoria_id UUID;

COMMENT ON COLUMN invoices.subcategoria_id IS 'Referência à subcategoria do Plano de Contas';

-- Adicionar coluna employee_id (nullable) na tabela invoices
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS employee_id UUID;

COMMENT ON COLUMN invoices.employee_id IS 'Referência ao funcionário vinculado (usado quando subcategoria requer vínculo)';

-- Adicionar foreign keys (apenas se as tabelas de referência existirem)
DO $$
BEGIN
    -- FK para subcategoria
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subcategoria') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_invoices_subcategoria'
              AND table_name = 'invoices'
        ) THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_subcategoria
                FOREIGN KEY (subcategoria_id) REFERENCES subcategoria(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- FK para employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_invoices_employee'
              AND table_name = 'invoices'
        ) THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_employee
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_invoices_subcategoria_id ON invoices(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_invoices_employee_id ON invoices(employee_id);
