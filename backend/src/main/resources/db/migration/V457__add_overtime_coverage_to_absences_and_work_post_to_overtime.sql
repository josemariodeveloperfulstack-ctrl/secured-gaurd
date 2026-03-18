-- Cobertura de falta: posto de trabalho e indicação de hora extra
-- Apenas colunas e índices (sem FKs) para funcionar em qualquer schema (ex.: CI com version 999 sem PKs em absences/work_posts)
ALTER TABLE absences
  ADD COLUMN IF NOT EXISTS coverage_work_post_id UUID,
  ADD COLUMN IF NOT EXISTS coverage_is_overtime BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE overtime
  ADD COLUMN IF NOT EXISTS work_post_id UUID,
  ADD COLUMN IF NOT EXISTS absence_id UUID;

CREATE INDEX IF NOT EXISTS idx_absences_coverage_work_post_id ON absences(coverage_work_post_id);
CREATE INDEX IF NOT EXISTS idx_overtime_work_post_id ON overtime(work_post_id);
CREATE INDEX IF NOT EXISTS idx_overtime_absence_id ON overtime(absence_id);
