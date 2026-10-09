SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'status'
  ),
  'ALTER TABLE maintenances ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT ''programado'' AFTER actions_taken, ADD KEY idx_maintenances_status (status)',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

CREATE TABLE IF NOT EXISTS maintenance_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  maintenance_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_maintenance_status_history_maintenance (maintenance_id, changed_at),
  CONSTRAINT fk_maintenance_status_history_maintenance FOREIGN KEY (maintenance_id) REFERENCES maintenances (id),
  CONSTRAINT fk_maintenance_status_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
);

INSERT INTO maintenance_status_history (maintenance_id, from_status, to_status, changed_by, changed_at)
SELECT m.id, NULL, m.status, m.created_by, m.created_at
FROM maintenances m
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_status_history h WHERE h.maintenance_id = m.id
);

INSERT INTO permissions (code, name) VALUES
  ('maintenance.update', 'Actualizar estado de mantenimientos')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
FROM profiles p
JOIN permissions perm ON perm.code = 'maintenance.update'
WHERE p.name = 'Administrador de edificio'
  AND NOT EXISTS (
    SELECT 1 FROM profile_permissions pp
    WHERE pp.profile_id = p.id AND pp.permission_id = perm.id
  );
