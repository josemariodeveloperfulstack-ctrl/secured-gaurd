-- Migration: V455__migrate_departments_to_work_posts.sql
-- Description: Move departments that are actually work posts (like VIA SHOPPING) to the work_posts table

DO $$
DECLARE
    default_client_id UUID;
    dept RECORD;
    new_wp_id UUID;
    wp_code VARCHAR(50);
BEGIN
    -- Get or create a default client to associate with the new work posts
    SELECT id INTO default_client_id FROM clients LIMIT 1;
    
    IF default_client_id IS NULL THEN
        default_client_id := gen_random_uuid();
        INSERT INTO clients (id, name, cnpj, email, phone)
        VALUES (default_client_id, 'CLIENTE PADRAO (SISTEMA)', '00.000.000/0001-00', 'contato@cliente.com', '0000000000');
    END IF;

    -- Iterate over departments that are likely work posts (not standard departments)
    FOR dept IN 
        SELECT id, name, description 
        FROM departments 
        WHERE name NOT ILIKE ANY (ARRAY[
            'Operacional', 'Financeiro', 'RH', 'DPE', 'Administrativo', 
            'Diretoria%', 'Comercial', 'TI', 'Tecnologia', 'Departamento Pessoal', 
            'Recursos Humanos', 'Atendimento', 'Supervisao%', 'Manutencao'
        ])
    LOOP
        -- Check if a work post with this name already exists
        SELECT id INTO new_wp_id FROM work_posts WHERE name = dept.name LIMIT 1;
        
        IF new_wp_id IS NULL THEN
            -- Generate a unique post code
            wp_code := 'WP-' || upper(substring(regexp_replace(dept.name, '[^a-zA-Z0-9]', '', 'g') from 1 for 10)) || '-' || substring(md5(random()::text) from 1 for 4);
            
            -- Insert into work_posts
            new_wp_id := gen_random_uuid();
            INSERT INTO work_posts (
                id, post_code, name, description, type, status, address, 
                client_id, required_vigilantes, work_schedule, shift_start, shift_end
            )
            VALUES (
                new_wp_id, wp_code, dept.name, dept.description, 'POSTO_12H_DIURNO', 'ATIVO', 'A DEFINIR',
                default_client_id, 1, '12x36', '07:00:00', '19:00:00'
            );
        END IF;
        
        -- Update employees to point to the new work post
        UPDATE employees 
        SET work_post_id = new_wp_id, department_id = NULL 
        WHERE department_id = dept.id;
        
        -- Delete the department (if there are no other constraints preventing it)
        BEGIN
            DELETE FROM departments WHERE id = dept.id;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore deletion if there are constraints (e.g. users linked to department)
        END;
    END LOOP;
END $$;
