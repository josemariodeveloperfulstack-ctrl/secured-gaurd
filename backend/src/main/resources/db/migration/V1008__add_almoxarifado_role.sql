-- V1008: Add ALMOXARIFADO role to roles table
INSERT INTO roles (id, name, description) 
VALUES (gen_random_uuid(), 'ALMOXARIFADO', 'Almoxarifado - Gestão de armazém e materiais')
ON CONFLICT (name) DO NOTHING;
