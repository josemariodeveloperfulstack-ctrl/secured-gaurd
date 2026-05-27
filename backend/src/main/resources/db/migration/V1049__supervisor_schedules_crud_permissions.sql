-- CRUD de escalas para supervisores
INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'SCHEDULES_READ' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'SCHEDULES_READ'
  );

INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'SCHEDULES_WRITE' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'SCHEDULES_WRITE'
  );

INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'SCHEDULES_CREATE' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'SCHEDULES_CREATE'
  );

INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'SCHEDULES_DELETE' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'SCHEDULES_DELETE'
  );
