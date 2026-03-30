-- Garante CRUD completo de contratos para o perfil COMERCIAL (API /api/contracts/** exige CONTRACTS_DELETE para DELETE)

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'COMERCIAL'
  AND p.name = 'CONTRACTS_DELETE'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
