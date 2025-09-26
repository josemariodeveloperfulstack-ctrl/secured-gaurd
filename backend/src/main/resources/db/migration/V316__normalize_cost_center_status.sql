-- Normalize cost_centers.status values to match Java enum (ATIVO, INATIVO, SUSPENSO)
-- and ensure default is set correctly.

-- 1) Update existing rows from English to Portuguese values if present
UPDATE cost_centers SET status = 'ATIVO'    WHERE status IN ('ACTIVE')    OR status ILIKE 'ativo';
UPDATE cost_centers SET status = 'INATIVO'  WHERE status IN ('INACTIVE')  OR status ILIKE 'inativo';
UPDATE cost_centers SET status = 'SUSPENSO' WHERE status IN ('SUSPENDED') OR status ILIKE 'suspenso';

-- 2) Ensure column type and default match expectations
ALTER TABLE cost_centers ALTER COLUMN status TYPE VARCHAR(20);
ALTER TABLE cost_centers ALTER COLUMN status SET DEFAULT 'ATIVO';

-- 3) Optional sanity: set any unexpected/null values to default
UPDATE cost_centers SET status = 'ATIVO' WHERE status IS NULL OR status NOT IN ('ATIVO','INATIVO','SUSPENSO');

-- 4) Helpful index (if not already exists) for status filtering
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'idx_cost_centers_status'
    ) THEN
        EXECUTE 'CREATE INDEX idx_cost_centers_status ON cost_centers(status)';
    END IF;
END $$;


