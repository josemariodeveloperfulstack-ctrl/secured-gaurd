-- Migration de correção para a V360 que pode ter falhado
-- Remove a tabela antiga e recria com a estrutura correta

-- Remover a tabela antiga se existir
DROP TABLE IF EXISTS visit_controls CASCADE;

-- Criar tabela de controle de visitas com estrutura correta
CREATE TABLE visit_controls (
    id UUID PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    supervisor_id UUID,
    work_post_id UUID,
    visit_date DATE NOT NULL,
    scheduled_at TIME NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    observations TEXT,
    findings TEXT,
    report_url VARCHAR(500),
    is_successful BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES employees(id),
    FOREIGN KEY (work_post_id) REFERENCES work_posts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_visit_controls_visit_date ON visit_controls(visit_date);
CREATE INDEX IF NOT EXISTS idx_visit_controls_status ON visit_controls(status);
CREATE INDEX IF NOT EXISTS idx_visit_controls_supervisor_id ON visit_controls(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_visit_controls_work_post_id ON visit_controls(work_post_id);
CREATE INDEX IF NOT EXISTS idx_visit_controls_scheduled_at ON visit_controls(scheduled_at);

-- Comentário na tabela
COMMENT ON TABLE visit_controls IS 'Gerencia o controle de visitas dos supervisores aos postos de trabalho';

-- Inserir dados de exemplo
INSERT INTO visit_controls (
    id, 
    location, 
    assigned_to, 
    visit_date, 
    scheduled_at, 
    status, 
    is_successful,
    observations
) VALUES 
(
    gen_random_uuid(), 
    'Empresa ABC Ltda', 
    'Ana Costa', 
    CURRENT_DATE, 
    '17:03:00', 
    'PENDING', 
    FALSE,
    'Visita de rotina agendada'
),
(
    gen_random_uuid(), 
    'Condominio Residencial Alpha', 
    'João Silva', 
    CURRENT_DATE, 
    '15:03:00', 
    'IN_PROGRESS', 
    FALSE,
    'Verificação de equipamentos de segurança'
),
(
    gen_random_uuid(), 
    'Shopping Center Norte', 
    'Maria Santos', 
    CURRENT_DATE, 
    '14:03:00', 
    'COMPLETED', 
    TRUE,
    'Visita concluída com sucesso'
),
(
    gen_random_uuid(), 
    'Edifício Comercial Central', 
    'Pedro Oliveira', 
    CURRENT_DATE - INTERVAL '1 day', 
    '16:00:00', 
    'COMPLETED', 
    TRUE,
    'Inspeção de segurança realizada'
);








