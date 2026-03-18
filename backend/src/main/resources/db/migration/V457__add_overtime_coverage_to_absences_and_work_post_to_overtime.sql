-- Cobertura de falta: posto de trabalho e indicação de hora extra
-- Apenas colunas; FKs criadas só se as tabelas referenciadas tiverem PRIMARY KEY (CI schema 999 pode não ter)
ALTER TABLE absences
  ADD COLUMN IF NOT EXISTS coverage_work_post_id UUID,
  ADD COLUMN IF NOT EXISTS coverage_is_overtime BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE overtime
  ADD COLUMN IF NOT EXISTS work_post_id UUID,
  ADD COLUMN IF NOT EXISTS absence_id UUID;

-- FKs só quando existir constraint única na coluna referenciada (evita erro em ambientes com schema atípico)
DO $$
BEGIN
  -- overtime.absence_id -> absences(id)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'absences'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE overtime DROP CONSTRAINT IF EXISTS fk_overtime_absence;
    ALTER TABLE overtime ADD CONSTRAINT fk_overtime_absence
      FOREIGN KEY (absence_id) REFERENCES absences(id) ON DELETE SET NULL;
  END IF;

  -- absences.coverage_work_post_id e overtime.work_post_id -> work_posts(id)
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
