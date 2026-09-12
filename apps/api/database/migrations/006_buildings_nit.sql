SET @building_migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'buildings'
      AND COLUMN_NAME = 'identification'
  ),
  'ALTER TABLE buildings CHANGE COLUMN identification nit VARCHAR(50) NOT NULL',
  'DO 0'
);
PREPARE building_migration FROM @building_migration_sql;
EXECUTE building_migration;
DEALLOCATE PREPARE building_migration;

SET @building_migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'buildings'
      AND INDEX_NAME = 'uq_buildings_identification'
  ),
  'ALTER TABLE buildings RENAME INDEX uq_buildings_identification TO uq_buildings_nit',
  'DO 0'
);
PREPARE building_migration FROM @building_migration_sql;
EXECUTE building_migration;
DEALLOCATE PREPARE building_migration;
