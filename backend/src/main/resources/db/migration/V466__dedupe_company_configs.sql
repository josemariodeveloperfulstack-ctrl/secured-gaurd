-- V466: Remove linhas físicas duplicadas com o mesmo id em company_configs (causa
-- Hibernate "Duplicate row was found and ASSERT was specified" em findById).
-- Mantém o registro mais recente por created_at.

DELETE FROM public.company_configs
WHERE ctid IN (
    SELECT ctid
    FROM (
        SELECT ctid,
               ROW_NUMBER() OVER (
                   PARTITION BY id
                   ORDER BY created_at DESC NULLS LAST, ctid DESC
               ) AS rn
        FROM public.company_configs
    ) t
    WHERE t.rn > 1
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'company_configs'
    )
       AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.company_configs'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE public.company_configs ADD PRIMARY KEY (id);
    END IF;
END $$;
