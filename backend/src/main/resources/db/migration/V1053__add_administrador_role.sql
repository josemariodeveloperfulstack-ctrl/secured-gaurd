-- Papel ADMINISTRADOR (acesso total operacional; distinto do legado ADMIN)
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMINISTRADOR') THEN
        admin_role_id := gen_random_uuid();
        INSERT INTO roles (id, name, description, created_at)
        VALUES (
            admin_role_id,
            'ADMINISTRADOR',
            'Administrador com acesso total aos módulos do sistema',
            NOW()
        );

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, rp.permission_id
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id AND r.name = 'SUPER_ADMIN'
        WHERE NOT EXISTS (
            SELECT 1 FROM role_permissions x
            WHERE x.role_id = admin_role_id AND x.permission_id = rp.permission_id
        );
    END IF;
END $$;
