SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'failure_description'
  ),
  'ALTER TABLE maintenances ADD COLUMN failure_description TEXT NULL AFTER description',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'cause'
  ),
  'ALTER TABLE maintenances ADD COLUMN cause TEXT NULL AFTER failure_description',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'actions_taken'
  ),
  'ALTER TABLE maintenances ADD COLUMN actions_taken TEXT NULL AFTER cause',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

SET @maintenance_migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'description' AND IS_NULLABLE = 'NO'
  ),
  'ALTER TABLE maintenances MODIFY COLUMN description TEXT NULL',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;
