SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'estimated_cost'
  ),
  'ALTER TABLE maintenances ADD COLUMN estimated_cost DECIMAL(15, 2) NULL AFTER status',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;

SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'actual_cost'
  ),
  'ALTER TABLE maintenances ADD COLUMN actual_cost DECIMAL(15, 2) NULL AFTER estimated_cost',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;
