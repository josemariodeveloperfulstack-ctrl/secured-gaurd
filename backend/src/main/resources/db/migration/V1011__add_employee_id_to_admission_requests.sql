-- Vincula solicitação de admissão/demissão ao cadastro de funcionário (integração CRUD)

ALTER TABLE admission_requests
    ADD COLUMN IF NOT EXISTS employee_id UUID NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_admission_requests_employee'
    ) THEN
        ALTER TABLE admission_requests
            ADD CONSTRAINT fk_admission_requests_employee
            FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admission_requests_employee_id ON admission_requests (employee_id);
