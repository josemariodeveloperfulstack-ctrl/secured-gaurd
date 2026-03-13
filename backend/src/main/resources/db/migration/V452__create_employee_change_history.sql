-- Histórico de alterações de dados do funcionário (audit trail). Append-only.
-- PRD: Aba de Histórico de Mudanças do Funcionário
-- FKs adicionadas condicionalmente para compatibilidade com schemas onde employees/users podem ter estrutura diferente.

CREATE TABLE IF NOT EXISTS employee_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    changed_by_user_id UUID,
    category VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200),
    old_value TEXT,
    new_value TEXT,
    reason TEXT
);

-- Adicionar FKs apenas se as tabelas referenciadas tiverem PRIMARY KEY (evita erro 42830 no CI)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employees' AND constraint_type = 'PRIMARY KEY'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_change_history' AND constraint_name = 'fk_employee_change_history_employee'
    ) THEN
        ALTER TABLE employee_change_history
        ADD CONSTRAINT fk_employee_change_history_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_change_history' AND constraint_name = 'fk_employee_change_history_user'
    ) THEN
        ALTER TABLE employee_change_history
        ADD CONSTRAINT fk_employee_change_history_user
        FOREIGN KEY (changed_by_user_id) REFERENCES users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_change_history_employee_id ON employee_change_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_change_history_changed_at ON employee_change_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_change_history_employee_category ON employee_change_history(employee_id, category);
CREATE INDEX IF NOT EXISTS idx_employee_change_history_changed_by ON employee_change_history(changed_by_user_id);

COMMENT ON TABLE employee_change_history IS 'Histórico de alterações de dados do funcionário para auditoria e conformidade (LGPD). Append-only.';
