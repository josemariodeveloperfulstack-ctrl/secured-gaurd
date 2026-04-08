-- V1009: Add ALMOXARIFADO role to roles table (safe conditional insert)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ALMOXARIFADO') THEN
        INSERT INTO roles (id, name, description)
        VALUES (gen_random_uuid(), 'ALMOXARIFADO', 'Almoxarifado - Gestão de armazém e materiais');
    END IF;
END $$;
