-- V1043: Enriquece a visita do supervisor (VisitControl)
-- Adiciona:
--   1. Múltiplas fotos da visita (ata, posto, EPI, etc.)
--   2. Problemas / dificuldades reportadas pelo funcionário alocado
--   3. Inventário rápido de equipamentos / veículos disponíveis no posto
--   4. Entregas de EPI registradas na visita (com foto comprobatória)
--
-- Cada tabela é child de `visit_controls(id)` com ON DELETE CASCADE — quando
-- a visita é excluída, os artefatos vão junto.

-- ====================================================================
-- 1) Fotos da visita (multi-upload)
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL REFERENCES visit_controls(id) ON DELETE CASCADE,
    file_url        VARCHAR(500) NOT NULL,
    /* Categoria da foto: GENERAL, POST, EQUIPMENT, EPI, INCIDENT, REPORT_SHEET */
    photo_type      VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
    caption         VARCHAR(500),
    taken_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by     UUID, -- referência opcional ao user/employee que fez upload
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vcphotos_visit ON visit_control_photos (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcphotos_type  ON visit_control_photos (visit_control_id, photo_type);

-- ====================================================================
-- 2) Problemas reportados pelo funcionário no posto
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL REFERENCES visit_controls(id) ON DELETE CASCADE,
    /* Categoria: SAFETY, INFRA, EQUIPMENT, BEHAVIOR, OTHER */
    category        VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    /* Severidade: LOW, MEDIUM, HIGH, CRITICAL */
    severity        VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    description     TEXT NOT NULL,
    reported_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP,
    resolution_notes TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vcissues_visit    ON visit_control_issues (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcissues_severity ON visit_control_issues (severity);

-- ====================================================================
-- 3) Inventário rápido de ativos no posto (equipamentos / veículos)
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_post_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL REFERENCES visit_controls(id) ON DELETE CASCADE,
    /* Tipo do ativo: EQUIPMENT, VEHICLE, OTHER */
    asset_type      VARCHAR(16) NOT NULL,
    /* Quando rastreável, aponta para equipments.id ou vehicles.id (não FK rígido — pode ser ad-hoc) */
    reference_id    UUID,
    description     VARCHAR(500) NOT NULL,
    /* Status: PRESENT, MISSING, DAMAGED, NEEDS_MAINTENANCE */
    status          VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vcassets_visit ON visit_control_post_assets (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcassets_type  ON visit_control_post_assets (visit_control_id, asset_type);

-- ====================================================================
-- 4) Entregas de EPI registradas durante a visita
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_epi_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL REFERENCES visit_controls(id) ON DELETE CASCADE,
    /* Funcionário que recebeu o EPI (geralmente igual a visit_controls.employee_id, mas pode diferir) */
    employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
    epi_item_description VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    photo_url       VARCHAR(500),  -- foto da entrega (assinatura, ou item entregue)
    employee_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vcepi_visit    ON visit_control_epi_deliveries (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcepi_employee ON visit_control_epi_deliveries (employee_id);

COMMENT ON TABLE visit_control_photos          IS 'Fotos anexadas à visita do supervisor (ata, posto, equipamentos, EPI).';
COMMENT ON TABLE visit_control_issues          IS 'Problemas/dificuldades relatados pelo funcionário alocado no posto.';
COMMENT ON TABLE visit_control_post_assets     IS 'Inventário rápido de equipamentos/veículos disponíveis no posto durante a visita.';
COMMENT ON TABLE visit_control_epi_deliveries  IS 'Entregas de EPI feitas durante a visita (com foto opcional para comprovação).';
