-- Migration: V1002__fix_missing_work_posts_ci.sql
-- Description: Insert missing work posts identified as orphaned in the CI environment
-- Author: Antigravity

-- Use the default client ID from V999
DO $$
DECLARE
    default_client_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
    -- RADIOSERVICE TRANSPORTES E LOCACAO LTDA
    IF NOT EXISTS (SELECT 1 FROM work_posts WHERE id = 'd0ca5376-ed78-4d96-9a26-6d9fd73d898d') THEN
        INSERT INTO work_posts (id, post_code, name, description, type, status, address, client_id, required_vigilantes, work_schedule, shift_start, shift_end, created_at, updated_at)
        VALUES ('d0ca5376-ed78-4d96-9a26-6d9fd73d898d', 'WP-RADIOSERVICE', 'RADIOSERVICE TRANSPORTES E LOCACAO LTDA', 'Posto exportado', 'POSTO_12H_DIURNO', 'ATIVO', 'A DEFINIR', default_client_id, 1, '12x36', '07:00:00', '19:00:00', NOW(), NOW());
    END IF;

    -- PANSE BRASIL IND E COM LTDA
    IF NOT EXISTS (SELECT 1 FROM work_posts WHERE id = '27461385-d7c0-4bae-b79f-47ff6302edac') THEN
        INSERT INTO work_posts (id, post_code, name, description, type, status, address, client_id, required_vigilantes, work_schedule, shift_start, shift_end, created_at, updated_at)
        VALUES ('27461385-d7c0-4bae-b79f-47ff6302edac', 'WP-PANSE', 'PANSE BRASIL IND E COM LTDA', 'Posto exportado', 'POSTO_12H_DIURNO', 'ATIVO', 'A DEFINIR', default_client_id, 1, '12x36', '07:00:00', '19:00:00', NOW(), NOW());
    END IF;

    -- RESI OVER RESERVA
    IF NOT EXISTS (SELECT 1 FROM work_posts WHERE id = '5cf7b230-35b8-4f64-9eb8-adf341727043') THEN
        INSERT INTO work_posts (id, post_code, name, description, type, status, address, client_id, required_vigilantes, work_schedule, shift_start, shift_end, created_at, updated_at)
        VALUES ('5cf7b230-35b8-4f64-9eb8-adf341727043', 'WP-RESIOVER', 'RESI OVER RESERVA', 'Posto exportado', 'POSTO_12H_DIURNO', 'ATIVO', 'A DEFINIR', default_client_id, 1, '12x36', '07:00:00', '19:00:00', NOW(), NOW());
    END IF;

    -- ADMINISTRATIVO
    IF NOT EXISTS (SELECT 1 FROM work_posts WHERE id = '66284ba3-079d-42a7-b8be-7d19f07b2a72') THEN
        INSERT INTO work_posts (id, post_code, name, description, type, status, address, client_id, required_vigilantes, work_schedule, shift_start, shift_end, created_at, updated_at)
        VALUES ('66284ba3-079d-42a7-b8be-7d19f07b2a72', 'WP-ADMIN', 'ADMINISTRATIVO', 'Posto exportado', 'POSTO_12H_DIURNO', 'ATIVO', 'A DEFINIR', default_client_id, 1, '12x36', '07:00:00', '19:00:00', NOW(), NOW());
    END IF;

    -- TI BRASIL IND E COM LTDA
    IF NOT EXISTS (SELECT 1 FROM work_posts WHERE id = '9931cc2a-a66c-4837-9e45-4d8aed8aa67d') THEN
        INSERT INTO work_posts (id, post_code, name, description, type, status, address, client_id, required_vigilantes, work_schedule, shift_start, shift_end, created_at, updated_at)
        VALUES ('9931cc2a-a66c-4837-9e45-4d8aed8aa67d', 'WP-TIBRASIL', 'TI BRASIL IND E COM LTDA', 'Posto exportado', 'POSTO_12H_DIURNO', 'ATIVO', 'A DEFINIR', default_client_id, 1, '12x36', '07:00:00', '19:00:00', NOW(), NOW());
    END IF;

END $$;
