-- Períodos de vínculo empregatício do funcionário (admissão, readmissão, promoção).
-- Permite recontratar o mesmo cadastro em outra empresa mantendo o histórico.

CREATE TABLE IF NOT EXISTS employee_employment_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    company_id UUID,
    unit_id UUID,
    position_id UUID,
    department_id UUID,
    work_post_id UUID,
    hire_date DATE NOT NULL,
    termination_date DATE,
    termination_reason VARCHAR(500),
    admission_type VARCHAR(30) NOT NULL DEFAULT 'PRIMEIRA_ADMISSAO',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    salario NUMERIC(15, 2),
    registration_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    CONSTRAINT chk_employment_period_admission_type
        CHECK (admission_type IN ('PRIMEIRA_ADMISSAO', 'READMISSAO', 'PROMOCAO')),
    CONSTRAINT chk_employment_period_status
        CHECK (status IN ('ACTIVE', 'TERMINATED'))
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employees' AND constraint_type = 'PRIMARY KEY'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_employment_periods' AND constraint_name = 'fk_employment_period_employee'
    ) THEN
        ALTER TABLE employee_employment_periods
        ADD CONSTRAINT fk_employment_period_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employment_period_employee_id
    ON employee_employment_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_period_employee_status
    ON employee_employment_periods(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_employment_period_hire_date
    ON employee_employment_periods(hire_date DESC);

COMMENT ON TABLE employee_employment_periods IS
    'Histórico de vínculos empregatícios: primeira admissão, readmissão e promoção em outra empresa.';

-- Backfill: um período por funcionário com os dados atuais do cadastro
INSERT INTO employee_employment_periods (
    employee_id,
    company_id,
    unit_id,
    position_id,
    department_id,
    work_post_id,
    hire_date,
    termination_date,
    termination_reason,
    admission_type,
    status,
    salario,
    registration_number
)
SELECT
    e.id,
    e.company_id,
    e.unit_id,
    e.position_id,
    e.department_id,
    e.work_post_id,
    COALESCE(e.hire_date, CURRENT_DATE),
    COALESCE(e.data_rescisao, e.termination_date),
    e.termination_reason,
    'PRIMEIRA_ADMISSAO',
    CASE WHEN e.status = 'TERMINATED' THEN 'TERMINATED' ELSE 'ACTIVE' END,
    e.salario,
    e.registration_number
FROM employees e
WHERE e.hire_date IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM employee_employment_periods p WHERE p.employee_id = e.id
  );
