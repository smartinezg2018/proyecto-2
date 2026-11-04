SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_quotes' AND COLUMN_NAME = 'conditions'
  ),
  'DO 0',
  'ALTER TABLE project_quotes ADD COLUMN conditions TEXT NULL AFTER scope'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_quotes' AND COLUMN_NAME = 'delivery_days'
  ),
  'DO 0',
  'ALTER TABLE project_quotes ADD COLUMN delivery_days INT UNSIGNED NULL AFTER conditions'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'selected_quote_id'
  ),
  'DO 0',
  'ALTER TABLE projects ADD COLUMN selected_quote_id BIGINT UNSIGNED NULL AFTER status'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'selection_justification'
  ),
  'DO 0',
  'ALTER TABLE projects ADD COLUMN selection_justification TEXT NULL AFTER selected_quote_id'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND INDEX_NAME = 'idx_projects_selected_quote'
  ),
  'DO 0',
  'ALTER TABLE projects ADD KEY idx_projects_selected_quote (selected_quote_id)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'
      AND CONSTRAINT_NAME = 'fk_projects_selected_quote'
  ),
  'DO 0',
  'ALTER TABLE projects ADD CONSTRAINT fk_projects_selected_quote FOREIGN KEY (selected_quote_id) REFERENCES project_quotes (id)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
