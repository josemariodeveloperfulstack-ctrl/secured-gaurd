-- Garante que ADMINISTRADOR tenha as mesmas permissões de SUPER_ADMIN (idempotente)
INSERT INTO role_permissions (role_id, permission_id)
SELECT admin_role.id, rp.permission_id
FROM roles admin_role
JOIN roles super_role ON super_role.name = 'SUPER_ADMIN'
JOIN role_permissions rp ON rp.role_id = super_role.id
WHERE admin_role.name = 'ADMINISTRADOR'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_id = admin_role.id
      AND existing.permission_id = rp.permission_id
  );
