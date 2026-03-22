-- Colunas usadas pela entidade WorkSchedule (JPA) e ausentes na criação inicial (V173).
-- Idempotente para ambientes que já tenham parte das colunas.
ALTER TABLE work_schedules
    ADD COLUMN IF NOT EXISTS sigla VARCHAR(5),
    ADD COLUMN IF NOT EXISTS remanejamento_id UUID,
    ADD COLUMN IF NOT EXISTS is_monitoria BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_hora_extra BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS coverage_schedule_id UUID,
    ADD COLUMN IF NOT EXISTS start_time VARCHAR(5),
    ADD COLUMN IF NOT EXISTS end_time VARCHAR(5);

-- Opcional: escala de cobertura aponta para outra linha de work_schedules (sem FK para evitar ciclos em seeds/CI).
CREATE INDEX IF NOT EXISTS idx_work_schedules_coverage_schedule_id ON work_schedules(coverage_schedule_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_remanejamento_id ON work_schedules(remanejamento_id);
