CREATE TABLE IF NOT EXISTS visit_control_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    filters TEXT,
    work_post_id UUID,
    work_post_name VARCHAR(255),
    status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    total_visits INTEGER NOT NULL,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visit_control_report_work_post FOREIGN KEY (work_post_id) REFERENCES work_posts(id) ON DELETE SET NULL,
    CONSTRAINT fk_visit_control_report_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_control_reports_created_by ON visit_control_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_visit_control_reports_created_at ON visit_control_reports(created_at DESC);



