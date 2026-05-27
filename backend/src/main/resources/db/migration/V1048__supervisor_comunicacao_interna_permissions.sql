-- Comunicação interna completa para supervisores (webmail + gestão de mensagens)
INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'MESSAGES_READ' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'MESSAGES_READ'
  );

INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'MESSAGES_WRITE' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'MESSAGES_WRITE'
  );

INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'MESSAGES_CREATE' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'MESSAGES_CREATE'
  );

INSERT INTO user_group_permissions (group_id, permission)
SELECT id, 'MESSAGES_MANAGE' FROM user_groups
WHERE group_name = 'GRUPO_SUPERVISOR'
  AND NOT EXISTS (
      SELECT 1 FROM user_group_permissions ugp
      WHERE ugp.group_id = (SELECT id FROM user_groups WHERE group_name = 'GRUPO_SUPERVISOR')
        AND ugp.permission = 'MESSAGES_MANAGE'
  );
