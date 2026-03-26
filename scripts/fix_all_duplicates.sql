-- ==========================================================
-- SECURED GUARD - CLEANUP DE DUPLICATAS (ROLES & PERMISSIONS)
-- ==========================================================

DO $$
DECLARE
    r_record RECORD;
    p_record RECORD;
    main_id UUID;
BEGIN
    -- 1. DEDUPLICAR ROLES
    RAISE NOTICE 'Iniciando deduplicação de ROLES...';
    FOR r_record IN (SELECT name FROM roles GROUP BY name HAVING count(*) > 1) LOOP
        -- Selecionar o ID que será mantido (o primeiro encontrado)
        SELECT id INTO main_id FROM roles WHERE name = r_record.name LIMIT 1;
        
        RAISE NOTICE 'Role duplicada: %, mantendo ID: %', r_record.name, main_id;
        
        -- Atualizar associações em user_roles
        UPDATE user_roles 
        SET role_id = main_id 
        WHERE role_id IN (SELECT id FROM roles WHERE name = r_record.name AND id != main_id)
        AND NOT EXISTS (
            SELECT 1 FROM user_roles ur2 
            WHERE ur2.user_id = user_roles.user_id AND ur2.role_id = main_id
        );
        -- Deletar associações órfãs (que seriam duplicadas se atualizadas)
        DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE name = r_record.name AND id != main_id);
        
        -- Atualizar associações em role_permissions
        UPDATE role_permissions 
        SET role_id = main_id 
        WHERE role_id IN (SELECT id FROM roles WHERE name = r_record.name AND id != main_id)
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp2 
            WHERE rp2.role_id = main_id AND rp2.permission_id = role_permissions.permission_id
        );
        DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE name = r_record.name AND id != main_id);
        
        -- Remover roles duplicadas
        DELETE FROM roles WHERE name = r_record.name AND id != main_id;
    END LOOP;

    -- 2. DEDUPLICAR PERMISSIONS
    RAISE NOTICE 'Iniciando deduplicação de PERMISSIONS...';
    FOR p_record IN (SELECT name FROM permissions GROUP BY name HAVING count(*) > 1) LOOP
        -- Selecionar o ID que será mantido
        SELECT id INTO main_id FROM permissions WHERE name = p_record.name LIMIT 1;
        
        RAISE NOTICE 'Permissão duplicada: %, mantendo ID: %', p_record.name, main_id;
        
        -- Atualizar associações em role_permissions
        UPDATE role_permissions 
        SET permission_id = main_id 
        WHERE permission_id IN (SELECT id FROM permissions WHERE name = p_record.name AND id != main_id)
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp2 
            WHERE rp2.role_id = role_permissions.role_id AND rp2.permission_id = main_id
        );
        DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name = p_record.name AND id != main_id);
        
        -- Atualizar associações em user_permissions
        UPDATE user_permissions 
        SET permission_id = main_id 
        WHERE permission_id IN (SELECT id FROM permissions WHERE name = p_record.name AND id != main_id)
        AND NOT EXISTS (
            SELECT 1 FROM user_permissions up2 
            WHERE up2.user_id = user_permissions.user_id AND up2.permission_id = main_id
        );
        DELETE FROM user_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name = p_record.name AND id != main_id);
        
        -- Remover permissões duplicadas
        DELETE FROM permissions WHERE name = p_record.name AND id != main_id;
    END LOOP;
    
    RAISE NOTICE 'Deduplicação concluída com sucesso.';
END $$;

-- 3. APLICAR CONSTRAINTS ÚNICAS (Para evitar reincidência)
DO $$
BEGIN
    -- Roles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_roles_name') THEN
        ALTER TABLE roles ADD CONSTRAINT uk_roles_name UNIQUE (name);
    END IF;

    -- Permissions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_permissions_name') THEN
        ALTER TABLE permissions ADD CONSTRAINT uk_permissions_name UNIQUE (name);
    END IF;
END $$;
