-- Período aquisitivo de férias calculado a partir da admissão e das últimas férias
ALTER TABLE vacations
ADD COLUMN IF NOT EXISTS periodo_aquisitivo VARCHAR(20);

COMMENT ON COLUMN vacations.periodo_aquisitivo IS 'Período aquisitivo de férias (ex: 2025/2026)';
