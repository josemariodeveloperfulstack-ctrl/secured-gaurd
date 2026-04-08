-- Migration to add missing abbreviation column to units table
-- This column is present in the Unit.java entity but was missing from migrations

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'units' AND column_name = 'abbreviation') THEN
        ALTER TABLE units ADD COLUMN abbreviation VARCHAR(10);
        COMMENT ON COLUMN units.abbreviation IS 'Sigla ou abreviação da unidade (ex: MATRIZ, FIL01)';
    END IF;
END $$;
