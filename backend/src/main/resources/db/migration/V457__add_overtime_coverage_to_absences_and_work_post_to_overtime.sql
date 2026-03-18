-- Cobertura de falta: posto de trabalho e indicação de hora extra
-- Colunas sem FK inline; FKs criadas só se work_posts(id) tiver PRIMARY KEY (evita erro em CI com schema 999)
ALTER TABLE absences
  ADD COLUMN IF NOT EXISTS coverage_work_post_id UUID,
  ADD COLUMN IF NOT EXISTS coverage_is_overtime BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE overtime
  ADD COLUMN IF NOT EXISTS work_post_id UUID,
  ADD COLUMN IF NOT EXISTS absence_id UUID;

-- FK para absences(id) em overtime (absences sempre tem PK em id)
ALTER TABLE overtime
  DROP CONSTRAINT IF EXISTS fk_overtime_absence;
ALTER TABLE overtime
  ADD CONSTRAINT fk_overtime_absence
  FOREIGN KEY (absence_id) REFERENCES absences(id) ON DELETE SET NULL;

-- FKs para work_posts(id) só se a tabela tiver PRIMARY KEY (ex.: CI com version 999 pode não ter)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'work_posts'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE absences DROP CONSTRAINT IF EXISTS fk_absences_coverage_work_post;
    ALTER TABLE absences ADD CONSTRAINT fk_absences_coverage_work_post
      FOREIGN KEY (coverage_work_post_id) REFERENCES work_posts(id) ON DELETE SET NULL;
    ALTER TABLE overtime DROP CONSTRAINT IF EXISTS fk_overtime_work_post;
    ALTER TABLE overtime ADD CONSTRAINT fk_overtime_work_post
      FOREIGN KEY (work_post_id) REFERENCES work_posts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_absences_coverage_work_post_id ON absences(coverage_work_post_id);
CREATE INDEX IF NOT EXISTS idx_overtime_work_post_id ON overtime(work_post_id);
CREATE INDEX IF NOT EXISTS idx_overtime_absence_id ON overtime(absence_id);
