-- Tabela de metas comerciais (Sales Goals)
CREATE TABLE IF NOT EXISTS sales_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    goal_type VARCHAR(50) NOT NULL,
    target_value NUMERIC(15, 2) NOT NULL,
    goal_period VARCHAR(50) NOT NULL,
    reference_month INTEGER NOT NULL,
    reference_year INTEGER NOT NULL,
    description TEXT,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_goals_user_id ON sales_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_reference ON sales_goals(reference_year, reference_month);
CREATE INDEX IF NOT EXISTS idx_sales_goals_type ON sales_goals(goal_type);
