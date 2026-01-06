-- Tabela de Ações Corretivas
CREATE TABLE IF NOT EXISTS corrective_actions (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    origin VARCHAR(50) NOT NULL, -- INSPECAO, ACIDENTE, AUDITORIA, NAO_CONFORMIDADE, OUTROS
    priority VARCHAR(20) NOT NULL, -- BAIXA, MEDIA, ALTA, CRITICA
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA
    responsible_user_id UUID,
    responsible_name VARCHAR(255),
    due_date DATE NOT NULL,
    completion_date DATE,
    department VARCHAR(100),
    notes TEXT,
    related_inspection_id UUID,
    related_accident_id UUID,
    related_non_conformity_id UUID,
    created_by_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_inspection_id) REFERENCES safety_inspections(id) ON DELETE SET NULL,
    FOREIGN KEY (related_accident_id) REFERENCES accident_records(id) ON DELETE SET NULL,
    FOREIGN KEY (related_non_conformity_id) REFERENCES non_conformities(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_priority ON corrective_actions(priority);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_origin ON corrective_actions(origin);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date ON corrective_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_responsible_user_id ON corrective_actions(responsible_user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

