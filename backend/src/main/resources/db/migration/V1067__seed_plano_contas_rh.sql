-- V1067: garante Plano de Contas + seed inicial (contas a pagar / RH)
-- Em ambientes que já passaram de V99 sem aplicar V99 (out-of-order), as tabelas
-- podem não existir. Por isso criamos com IF NOT EXISTS antes do seed.

CREATE TABLE IF NOT EXISTS categoria_pai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_pai_id UUID NOT NULL REFERENCES categoria_pai(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    requer_vinculo_funcionario BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Colunas em invoices (idempotente; V99/V1062 podem já ter criado)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subcategoria_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS employee_id UUID;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subcategoria') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_invoices_subcategoria' AND table_name = 'invoices'
        ) THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_subcategoria
                FOREIGN KEY (subcategoria_id) REFERENCES subcategoria(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_invoices_employee' AND table_name = 'invoices'
        ) THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_employee
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_subcategoria_id ON invoices(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_invoices_employee_id ON invoices(employee_id);

INSERT INTO categoria_pai (id, nome, codigo, created_at, updated_at)
VALUES
  ('a1000001-0000-4000-8000-000000000001', 'Pessoal / RH', '01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a1000001-0000-4000-8000-000000000002', 'Tributos e Documentos Fiscais', '02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a1000001-0000-4000-8000-000000000003', 'Despesas Operacionais', '03', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a1000001-0000-4000-8000-000000000004', 'Despesas Administrativas', '04', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subcategoria (id, categoria_pai_id, nome, codigo, requer_vinculo_funcionario, created_at, updated_at)
SELECT
  v.id,
  cp.id,
  v.nome,
  v.codigo,
  v.requer,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  VALUES
    ('b2000001-0000-4000-8000-000000000001'::uuid, '01', 'Rescisão de funcionários', '01.01', TRUE),
    ('b2000001-0000-4000-8000-000000000002'::uuid, '01', 'Vale para funcionário', '01.02', TRUE),
    ('b2000001-0000-4000-8000-000000000003'::uuid, '01', 'Ajuda de custo para funcionário', '01.03', TRUE),
    ('b2000001-0000-4000-8000-000000000004'::uuid, '01', 'Adiantamento salarial', '01.04', TRUE),
    ('b2000001-0000-4000-8000-000000000005'::uuid, '02', 'Documentos fiscais (funcionário)', '02.01', TRUE),
    ('b2000001-0000-4000-8000-000000000006'::uuid, '02', 'Impostos e taxas', '02.02', FALSE),
    ('b2000001-0000-4000-8000-000000000007'::uuid, '03', 'Materiais e insumos', '03.01', FALSE),
    ('b2000001-0000-4000-8000-000000000008'::uuid, '03', 'Manutenção e serviços', '03.02', FALSE),
    ('b2000001-0000-4000-8000-000000000009'::uuid, '04', 'Aluguel e condomínio', '04.01', FALSE),
    ('b2000001-0000-4000-8000-000000000010'::uuid, '04', 'Utilidades (água/luz/internet)', '04.02', FALSE)
) AS v(id, cat_codigo, nome, codigo, requer)
JOIN categoria_pai cp ON cp.codigo = v.cat_codigo
ON CONFLICT (codigo) DO NOTHING;

UPDATE subcategoria
SET requer_vinculo_funcionario = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE codigo IN ('01.01', '01.02', '01.03', '01.04', '02.01');
