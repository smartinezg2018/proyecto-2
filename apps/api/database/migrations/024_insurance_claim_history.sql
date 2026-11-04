SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'insurance_claims' AND COLUMN_NAME = 'result'
  ),
  'DO 0',
  'ALTER TABLE insurance_claims ADD COLUMN result TEXT NULL AFTER status'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'insurance_claims' AND COLUMN_NAME = 'indemnity_amount'
  ),
  'DO 0',
  'ALTER TABLE insurance_claims ADD COLUMN indemnity_amount DECIMAL(15, 2) NULL AFTER claimed_amount'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'insurance_claims' AND COLUMN_NAME = 'resolved_at'
  ),
  'DO 0',
  'ALTER TABLE insurance_claims ADD COLUMN resolved_at DATE NULL AFTER indemnity_amount'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'insurance_claims'
      AND CONSTRAINT_NAME = 'chk_insurance_claims_indemnity_amount'
  ),
  'DO 0',
  'ALTER TABLE insurance_claims ADD CONSTRAINT chk_insurance_claims_indemnity_amount CHECK (indemnity_amount IS NULL OR indemnity_amount >= 0)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
