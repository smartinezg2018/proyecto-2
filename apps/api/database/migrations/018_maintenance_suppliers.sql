SET @maintenance_migration_sql = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenances'
      AND COLUMN_NAME = 'supplier_id'
  ),
  'ALTER TABLE maintenances ADD COLUMN supplier_id BIGINT UNSIGNED NULL AFTER building_id, ADD COLUMN supplier_document_ref VARCHAR(255) NULL AFTER supplier_id, ADD KEY idx_maintenances_supplier (supplier_id), ADD CONSTRAINT fk_maintenances_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)',
  'DO 0'
);
PREPARE maintenance_migration FROM @maintenance_migration_sql;
EXECUTE maintenance_migration;
DEALLOCATE PREPARE maintenance_migration;
