-- V1008: Add ALMOXARIFADO role and enforce unique constraint on name
-- First, clean up any duplicate role names to allow the unique constraint
DELETE FROM roles 
WHERE ctid NOT IN (
    SELECT MIN(ctid) 
    FROM roles 
    GROUP BY name
);

DO $$
BEGIN
    -- Add unique constraint on name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'roles_name_key' OR conname = 'uk_roles_name'
    ) THEN
        -- Check if there's any unique index on name
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'roles' AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%name%'
        ) THEN
            ALTER TABLE roles ADD CONSTRAINT uk_roles_name UNIQUE (name);
        END IF;
    END IF;

    -- Insert ALMOXARIFADO role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ALMOXARIFADO') THEN
        INSERT INTO roles (id, name, description)
        VALUES (gen_random_uuid(), 'ALMOXARIFADO', 'Almoxarifado - Gestão de armazém e materiais');
    END IF;
END $$;
