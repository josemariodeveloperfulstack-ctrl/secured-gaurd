-- V1044: Fluxo de aprovação de Remanejamento (PENDING / APPROVED / REJECTED / CANCELLED)
--
-- Cenário: o Supervisor identifica em campo (durante uma visita) que precisa remanejar
-- um funcionário do posto — por exemplo, porque ele tem treinamento pendente — e
-- precisa que o GESTOR OPERACIONAL autorize. Esta migration adiciona o ciclo de
-- aprovação a `remanejamentos` sem quebrar o uso histórico da entidade.

ALTER TABLE remanejamentos
    ADD COLUMN IF NOT EXISTS status VARCHAR(16),                  -- NULL = legado, não usa fluxo
    ADD COLUMN IF NOT EXISTS motivo VARCHAR(32),                  -- enum RemanejamentoMotivo
    ADD COLUMN IF NOT EXISTS requested_by_user_id UUID,           -- supervisor que solicitou
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS approved_by_user_id UUID,            -- gestor que aprovou
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS coverage_employee_id UUID,           -- funcionário que cobrirá o posto
    ADD COLUMN IF NOT EXISTS visit_control_id UUID;               -- visita que originou (quando aplicável)

-- FKs (criadas como NOT VALID + VALIDATE pra ser tolerante a dados legados)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_remanejamento_requested_by') THEN
        ALTER TABLE remanejamentos
            ADD CONSTRAINT fk_remanejamento_requested_by
            FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_remanejamento_approved_by') THEN
        ALTER TABLE remanejamentos
            ADD CONSTRAINT fk_remanejamento_approved_by
            FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_remanejamento_coverage_emp') THEN
        ALTER TABLE remanejamentos
            ADD CONSTRAINT fk_remanejamento_coverage_emp
            FOREIGN KEY (coverage_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_remanejamento_visit') THEN
        ALTER TABLE remanejamentos
            ADD CONSTRAINT fk_remanejamento_visit
            FOREIGN KEY (visit_control_id) REFERENCES visit_controls(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_remanejamentos_status
    ON remanejamentos (status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remanejamentos_requested_by
    ON remanejamentos (requested_by_user_id) WHERE requested_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remanejamentos_pending
    ON remanejamentos (status, requested_at) WHERE status = 'PENDING';

COMMENT ON COLUMN remanejamentos.status IS
    'Estado do fluxo de aprovação. NULL = remanejamento legado (sem fluxo). Caso contrário: PENDING/APPROVED/REJECTED/CANCELLED.';
COMMENT ON COLUMN remanejamentos.motivo IS
    'Motivo de negócio (TRAINING_PENDING, UNCOVERED_ABSENCE, HEALTH_ISSUE, DISCIPLINARY, OTHER).';
COMMENT ON COLUMN remanejamentos.coverage_employee_id IS
    'Funcionário escolhido para cobrir o posto enquanto o original é remanejado.';
COMMENT ON COLUMN remanejamentos.visit_control_id IS
    'Visita do supervisor que originou esta solicitação (opcional).';
