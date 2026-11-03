INSERT INTO permissions (code, name) VALUES
  ('units.delete', 'Eliminar inmuebles')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO profile_permissions (profile_id, permission_id)
SELECT pp.profile_id, delete_perm.id
FROM profile_permissions pp
INNER JOIN permissions create_perm ON create_perm.id = pp.permission_id AND create_perm.code = 'units.create'
INNER JOIN permissions delete_perm ON delete_perm.code = 'units.delete'
WHERE NOT EXISTS (
  SELECT 1
  FROM profile_permissions existing
  WHERE existing.profile_id = pp.profile_id
    AND existing.permission_id = delete_perm.id
);
