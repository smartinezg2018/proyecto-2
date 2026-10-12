SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'frequency'
  ),
  'ALTER TABLE maintenances ADD COLUMN frequency VARCHAR(20) NULL AFTER maintenance_date',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'responsible'
  ),
  'ALTER TABLE maintenances ADD COLUMN responsible VARCHAR(150) NULL AFTER frequency',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'next_execution_date'
  ),
  'ALTER TABLE maintenances ADD COLUMN next_execution_date DATE NULL AFTER responsible',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

CREATE TABLE IF NOT EXISTS maintenance_alert_settings (
  building_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  alert_days SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  updated_by BIGINT UNSIGNED,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_maintenance_alert_settings_building FOREIGN KEY (building_id) REFERENCES buildings (id)
);

CREATE TABLE IF NOT EXISTS maintenance_alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  maintenance_id BIGINT UNSIGNED NOT NULL,
  target_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attended_at DATETIME NULL,
  attended_by BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_maintenance_alerts_target (maintenance_id, target_date),
  KEY idx_maintenance_alerts_building_status (building_id, status),
  CONSTRAINT fk_maintenance_alerts_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_maintenance_alerts_maintenance FOREIGN KEY (maintenance_id) REFERENCES maintenances (id)
);
