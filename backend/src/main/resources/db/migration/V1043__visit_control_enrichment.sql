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
-- Pré-requisito: visit_controls(id) precisa de PK/UNIQUE para FKs filhas
-- (bases legadas / Hibernate podem ter a tabela sem constraint)
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'visit_controls'
    ) THEN
        RAISE EXCEPTION 'Tabela visit_controls não existe; execute migrações V360/V361 antes de V1043';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_schema = kcu.constraint_schema
         AND tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'visit_controls'
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
          AND kcu.column_name = 'id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visit_controls'
              AND column_name = 'id'
        ) THEN
            RAISE EXCEPTION 'Coluna visit_controls.id não existe; estrutura incompatível com V1043';
        END IF;

        UPDATE visit_controls SET id = gen_random_uuid() WHERE id IS NULL;

        IF EXISTS (
            SELECT 1 FROM visit_controls GROUP BY id HAVING COUNT(*) > 1
        ) THEN
            DELETE FROM visit_controls a
            USING visit_controls b
            WHERE a.id = b.id AND a.ctid < b.ctid;
        END IF;

        ALTER TABLE visit_controls ADD PRIMARY KEY (id);
    END IF;
END $$;

-- ====================================================================
-- 1) Fotos da visita (multi-upload)
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_photos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL,
    file_url         VARCHAR(500) NOT NULL,
    /* Categoria da foto: GENERAL, POST, EQUIPMENT, EPI, INCIDENT, REPORT_SHEET */
    photo_type       VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
    caption          VARCHAR(500),
    taken_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by      UUID,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vcphotos_visit_control') THEN
        ALTER TABLE visit_control_photos
            ADD CONSTRAINT fk_vcphotos_visit_control
            FOREIGN KEY (visit_control_id) REFERENCES visit_controls(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vcphotos_visit ON visit_control_photos (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcphotos_type  ON visit_control_photos (visit_control_id, photo_type);

-- ====================================================================
-- 2) Problemas reportados pelo funcionário no posto
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_issues (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL,
    /* Categoria: SAFETY, INFRA, EQUIPMENT, BEHAVIOR, OTHER */
    category         VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    /* Severidade: LOW, MEDIUM, HIGH, CRITICAL */
    severity         VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    description      TEXT NOT NULL,
    reported_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at      TIMESTAMP,
    resolution_notes TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vcissues_visit_control') THEN
        ALTER TABLE visit_control_issues
            ADD CONSTRAINT fk_vcissues_visit_control
            FOREIGN KEY (visit_control_id) REFERENCES visit_controls(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vcissues_visit    ON visit_control_issues (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcissues_severity ON visit_control_issues (severity);

-- ====================================================================
-- 3) Inventário rápido de ativos no posto (equipamentos / veículos)
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_post_assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id UUID NOT NULL,
    /* Tipo do ativo: EQUIPMENT, VEHICLE, OTHER */
    asset_type       VARCHAR(16) NOT NULL,
    reference_id     UUID,
    description      VARCHAR(500) NOT NULL,
    /* Status: PRESENT, MISSING, DAMAGED, NEEDS_MAINTENANCE */
    status           VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
    notes            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vcassets_visit_control') THEN
        ALTER TABLE visit_control_post_assets
            ADD CONSTRAINT fk_vcassets_visit_control
            FOREIGN KEY (visit_control_id) REFERENCES visit_controls(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vcassets_visit ON visit_control_post_assets (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcassets_type  ON visit_control_post_assets (visit_control_id, asset_type);

-- ====================================================================
-- 4) Entregas de EPI registradas durante a visita
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_control_epi_deliveries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_control_id     UUID NOT NULL,
    employee_id          UUID,
    epi_item_description VARCHAR(255) NOT NULL,
    quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    photo_url            VARCHAR(500),
    employee_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes                TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vcepi_visit_control') THEN
        ALTER TABLE visit_control_epi_deliveries
            ADD CONSTRAINT fk_vcepi_visit_control
            FOREIGN KEY (visit_control_id) REFERENCES visit_controls(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employees' AND constraint_type = 'PRIMARY KEY'
    ) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vcepi_employee') THEN
        ALTER TABLE visit_control_epi_deliveries
            ADD CONSTRAINT fk_vcepi_employee
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vcepi_visit    ON visit_control_epi_deliveries (visit_control_id);
CREATE INDEX IF NOT EXISTS idx_vcepi_employee ON visit_control_epi_deliveries (employee_id);

COMMENT ON TABLE visit_control_photos          IS 'Fotos anexadas à visita do supervisor (ata, posto, equipamentos, EPI).';
COMMENT ON TABLE visit_control_issues          IS 'Problemas/dificuldades relatados pelo funcionário alocado no posto.';
COMMENT ON TABLE visit_control_post_assets     IS 'Inventário rápido de equipamentos/veículos disponíveis no posto durante a visita.';
COMMENT ON TABLE visit_control_epi_deliveries  IS 'Entregas de EPI feitas durante a visita (com foto opcional para comprovação).';
