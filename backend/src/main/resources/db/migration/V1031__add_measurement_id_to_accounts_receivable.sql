-- Vincula uma conta a receber a um Boletim de Medicao existente (medicoes ja cadastradas no modulo financeiro).
-- O campo measurement_number permanece como texto livre para casos legados/avulsos.

ALTER TABLE accounts_receivable
    ADD COLUMN IF NOT EXISTS measurement_id UUID;

-- FK exige UNIQUE/PK só na coluna referenciada (PostgreSQL 42830).
-- Bases com measurement_bulletins sem PK em id (IF NOT EXISTS legado, restore, etc.).
DO $$
DECLARE
    tbl_exists        boolean;
    id_uniquely_keyed boolean;
    tbl_has_pk        boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'measurement_bulletins'
    ) INTO tbl_exists;

    IF NOT tbl_exists THEN
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'measurement_bulletins'
          AND c.contype IN ('p', 'u')
          AND array_length(c.conkey, 1) = 1
          AND EXISTS (
              SELECT 1
              FROM pg_attribute a
              WHERE a.attrelid = t.oid
                AND a.attnum = c.conkey[1]
                AND NOT a.attisdropped
                AND a.attname = 'id'
          )
    ) INTO id_uniquely_keyed;

    IF id_uniquely_keyed THEN
        RETURN;
    END IF;

    DELETE FROM measurement_bulletins mb
    WHERE EXISTS (
        SELECT 1 FROM measurement_bulletins other
        WHERE other.id = mb.id AND other.ctid < mb.ctid
    );

    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint co
        JOIN pg_class cl ON cl.oid = co.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'public'
          AND cl.relname = 'measurement_bulletins'
          AND co.contype = 'p'
    ) INTO tbl_has_pk;

    IF NOT tbl_has_pk THEN
        BEGIN
            ALTER TABLE measurement_bulletins
                ADD CONSTRAINT measurement_bulletins_pkey PRIMARY KEY (id);
        EXCEPTION
            WHEN unique_violation THEN
                DELETE FROM measurement_bulletins mb
                WHERE EXISTS (
                    SELECT 1 FROM measurement_bulletins other
                    WHERE other.id = mb.id AND other.ctid < mb.ctid
                );
                ALTER TABLE measurement_bulletins
                    ADD CONSTRAINT measurement_bulletins_pkey PRIMARY KEY (id);
        END;
    ELSE
        BEGIN
            ALTER TABLE measurement_bulletins
                ADD CONSTRAINT measurement_bulletins_id_uq_for_fk UNIQUE (id);
        EXCEPTION
            WHEN unique_violation THEN
                DELETE FROM measurement_bulletins mb
                WHERE EXISTS (
                    SELECT 1 FROM measurement_bulletins other
                    WHERE other.id = mb.id AND other.ctid < mb.ctid
                );
                ALTER TABLE measurement_bulletins
                    ADD CONSTRAINT measurement_bulletins_id_uq_for_fk UNIQUE (id);
        END;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
DECLARE
    id_referenciable boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'measurement_bulletins'
          AND c.contype IN ('p', 'u')
          AND array_length(c.conkey, 1) = 1
          AND EXISTS (
              SELECT 1
              FROM pg_attribute a
              WHERE a.attrelid = t.oid
                AND a.attnum = c.conkey[1]
                AND NOT a.attisdropped
                AND a.attname = 'id'
          )
    ) INTO id_referenciable;

    IF NOT id_referenciable THEN
        RAISE NOTICE 'V1031: pulando fk_accounts_receivable_measurement — measurement_bulletins.id sem UNIQUE/PK de coluna única';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'accounts_receivable'
          AND constraint_name = 'fk_accounts_receivable_measurement'
    ) THEN
        ALTER TABLE accounts_receivable
            ADD CONSTRAINT fk_accounts_receivable_measurement
            FOREIGN KEY (measurement_id) REFERENCES measurement_bulletins (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_measurement_id
    ON accounts_receivable (measurement_id);
