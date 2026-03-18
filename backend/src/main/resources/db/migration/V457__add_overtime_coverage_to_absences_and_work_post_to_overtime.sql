-- Cobertura de falta: posto de trabalho e indicação de hora extra
ALTER TABLE absences
  ADD COLUMN IF NOT EXISTS coverage_work_post_id UUID REFERENCES work_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coverage_is_overtime BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_absences_coverage_work_post_id ON absences(coverage_work_post_id);

-- Overtime: posto de trabalho e vínculo com falta (cobertura)
ALTER TABLE overtime
  ADD COLUMN IF NOT EXISTS work_post_id UUID REFERENCES work_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS absence_id UUID REFERENCES absences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_overtime_work_post_id ON overtime(work_post_id);
CREATE INDEX IF NOT EXISTS idx_overtime_absence_id ON overtime(absence_id);
