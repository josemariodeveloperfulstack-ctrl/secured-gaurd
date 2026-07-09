ALTER TABLE work_posts
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS primary_position_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_work_posts_company'
          AND table_name = 'work_posts'
    ) THEN
        ALTER TABLE work_posts
            ADD CONSTRAINT fk_work_posts_company
            FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_work_posts_primary_position'
          AND table_name = 'work_posts'
    ) THEN
        ALTER TABLE work_posts
            ADD CONSTRAINT fk_work_posts_primary_position
            FOREIGN KEY (primary_position_id) REFERENCES positions(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_posts_company_id ON work_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_work_posts_primary_position_id ON work_posts(primary_position_id);
