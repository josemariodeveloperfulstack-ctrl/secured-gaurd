-- Migration to replace centro_custo with work_post association in accounts_receivable
ALTER TABLE accounts_receivable ADD COLUMN work_post_id UUID;

-- Add foreign key constraint pointing to work_posts table
ALTER TABLE accounts_receivable 
ADD CONSTRAINT fk_accounts_receivable_work_post 
FOREIGN KEY (work_post_id) 
REFERENCES work_posts(id) 
ON DELETE SET NULL;

-- Try to migrate legacy free-text centro_custo values to corresponding work_posts by name matching (approximate matching)
UPDATE accounts_receivable ar
SET work_post_id = wp.id
FROM work_posts wp
WHERE ar.client_id = wp.client_id
  AND ar.work_post_id IS NULL
  AND LOWER(TRIM(ar.centro_custo)) = LOWER(TRIM(wp.name));
