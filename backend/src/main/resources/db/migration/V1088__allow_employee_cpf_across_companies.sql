-- Regra de negócio: o mesmo CPF pode existir em mais de uma empresa,
-- desde que haja no máximo UM vínculo não demitido (ativo) no sistema.
-- A UNIQUE global em document impedia demitir em A e admitir em B.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'employees'
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) ILIKE '%document%'
    LOOP
        EXECUTE format('ALTER TABLE employees DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

DROP INDEX IF EXISTS employees_document_key;
DROP INDEX IF EXISTS uk_employees_document;

-- Garante no máximo um vínculo NÃO demitido por CPF (dígitos de document/cpf).
-- Só cria se não houver duplicatas ativas conflitantes.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM (
            SELECT REGEXP_REPLACE(COALESCE(NULLIF(TRIM(document), ''), NULLIF(TRIM(cpf), ''), ''), '[^0-9]', '', 'g') AS cpf_digits
            FROM employees
            WHERE CAST(status AS text) <> 'TERMINATED'
        ) s
        WHERE LENGTH(cpf_digits) = 11
        GROUP BY cpf_digits
        HAVING COUNT(*) > 1
    ) THEN
        EXECUTE $idx$
            CREATE UNIQUE INDEX IF NOT EXISTS uk_employees_one_active_cpf
            ON employees (
                (REGEXP_REPLACE(COALESCE(NULLIF(TRIM(document), ''), NULLIF(TRIM(cpf), ''), ''), '[^0-9]', '', 'g'))
            )
            WHERE CAST(status AS text) <> 'TERMINATED'
              AND LENGTH(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(document), ''), NULLIF(TRIM(cpf), ''), ''), '[^0-9]', '', 'g')) = 11
        $idx$;
    ELSE
        RAISE NOTICE 'uk_employees_one_active_cpf não criado: existem CPFs com mais de um vínculo ativo. Corrija e rode a migration novamente ou crie o índice manualmente.';
    END IF;
END $$;
