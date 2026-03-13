-- Histórico de alterações de dados do funcionário (audit trail). Append-only.
-- PRD: Aba de Histórico de Mudanças do Funcionário

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
    reason TEXT,
    CONSTRAINT fk_employee_change_history_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_employee_change_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_employee_change_history_employee_id ON employee_change_history(employee_id);
CREATE INDEX idx_employee_change_history_changed_at ON employee_change_history(changed_at DESC);
CREATE INDEX idx_employee_change_history_employee_category ON employee_change_history(employee_id, category);
CREATE INDEX idx_employee_change_history_changed_by ON employee_change_history(changed_by_user_id);

COMMENT ON TABLE employee_change_history IS 'Histórico de alterações de dados do funcionário para auditoria e conformidade (LGPD). Append-only.';
