-- Migration para criar a estrutura de visitas do supervisor (check-in em posto de trabalho)
-- Registra a visita do supervisor, o funcionário verificado no posto, seu vínculo
-- (efetivo, remanejado, cobertura de férias) e a geolocalização do check-in.

CREATE TABLE IF NOT EXISTS supervisor_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID,
    work_post_id UUID NOT NULL,
    client_id UUID,
    checked_employee_id UUID,
    allocation_type VARCHAR(30),
    allocation_description TEXT,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    description TEXT,
    observations TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_address VARCHAR(500),
    qr_code_scanned VARCHAR(500),
    qr_code_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT fk_supervisor_visits_supervisor FOREIGN KEY (supervisor_id) REFERENCES employees(id),
    CONSTRAINT fk_supervisor_visits_work_post FOREIGN KEY (work_post_id) REFERENCES work_posts(id),
    CONSTRAINT fk_supervisor_visits_client FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_supervisor_visits_checked_employee FOREIGN KEY (checked_employee_id) REFERENCES employees(id),
    CONSTRAINT fk_supervisor_visits_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_supervisor_visits_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_visits_supervisor_date ON supervisor_visits(supervisor_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_supervisor_visits_work_post_date ON supervisor_visits(work_post_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_supervisor_visits_checked_employee ON supervisor_visits(checked_employee_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_visits_date ON supervisor_visits(visit_date);

-- Tabelas de coleção (ElementCollection)
CREATE TABLE IF NOT EXISTS supervisor_visit_employees (
    visit_id UUID NOT NULL,
    employee_id UUID,
    CONSTRAINT fk_supervisor_visit_employees_visit FOREIGN KEY (visit_id) REFERENCES supervisor_visits(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_supervisor_visit_employees_visit ON supervisor_visit_employees(visit_id);

CREATE TABLE IF NOT EXISTS supervisor_visit_files (
    visit_id UUID NOT NULL,
    file_path VARCHAR(500),
    CONSTRAINT fk_supervisor_visit_files_visit FOREIGN KEY (visit_id) REFERENCES supervisor_visits(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_supervisor_visit_files_visit ON supervisor_visit_files(visit_id);

CREATE TABLE IF NOT EXISTS supervisor_visit_photos (
    visit_id UUID NOT NULL,
    photo_path VARCHAR(500),
    CONSTRAINT fk_supervisor_visit_photos_visit FOREIGN KEY (visit_id) REFERENCES supervisor_visits(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_supervisor_visit_photos_visit ON supervisor_visit_photos(visit_id);
