-- Adicionar colunas faltantes na tabela operational_occurrences
-- A entidade OperationalOccurrence possui esses campos mas V174 não os criou

DO $$
BEGIN
    -- category
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'category'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN category VARCHAR(255);
    END IF;

    -- substitute_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'substitute_id'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN substitute_id UUID REFERENCES employees(id);
    END IF;

    -- original_start_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'original_start_time'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN original_start_time VARCHAR(50);
    END IF;

    -- original_end_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'original_end_time'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN original_end_time VARCHAR(50);
    END IF;

    -- substitute_start_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'substitute_start_time'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN substitute_start_time VARCHAR(50);
    END IF;

    -- substitute_end_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'substitute_end_time'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN substitute_end_time VARCHAR(50);
    END IF;

    -- total_hours
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operational_occurrences' AND column_name = 'total_hours'
    ) THEN
        ALTER TABLE operational_occurrences ADD COLUMN total_hours DOUBLE PRECISION;
    END IF;
END $$;
