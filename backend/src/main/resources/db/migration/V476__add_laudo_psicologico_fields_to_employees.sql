-- Adicionar campos de Laudo Psicológico ao Employee
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS laudo_psicologico_data DATE,
ADD COLUMN IF NOT EXISTS laudo_psicologico_vencimento DATE,
ADD COLUMN IF NOT EXISTS laudo_psicologico_resultado VARCHAR(50),
ADD COLUMN IF NOT EXISTS laudo_psicologico_doctor_id UUID,
ADD COLUMN IF NOT EXISTS laudo_psicologico_observacoes TEXT;

-- Adicionar foreign key para doctor (opcional, pode ser null)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_employees_laudo_psicologico_doctor'
    ) THEN
        ALTER TABLE employees
        ADD CONSTRAINT fk_employees_laudo_psicologico_doctor
        FOREIGN KEY (laudo_psicologico_doctor_id) 
        REFERENCES doctors(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_employees_laudo_psicologico_data ON employees(laudo_psicologico_data);
CREATE INDEX IF NOT EXISTS idx_employees_laudo_psicologico_vencimento ON employees(laudo_psicologico_vencimento);
