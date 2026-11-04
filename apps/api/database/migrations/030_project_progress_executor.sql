SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_progress' AND COLUMN_NAME = 'quote_id'
  ),
  'DO 0',
  'ALTER TABLE project_progress ADD COLUMN quote_id BIGINT UNSIGNED NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_progress' AND COLUMN_NAME = 'supplier_id'
  ),
  'DO 0',
  'ALTER TABLE project_progress ADD COLUMN supplier_id BIGINT UNSIGNED NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_progress' AND COLUMN_NAME = 'supplier_name'
  ),
  'DO 0',
  'ALTER TABLE project_progress ADD COLUMN supplier_name VARCHAR(150) NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_progress' AND INDEX_NAME = 'idx_project_progress_quote'
  ),
  'DO 0',
  'ALTER TABLE project_progress ADD KEY idx_project_progress_quote (quote_id)'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_progress'
      AND CONSTRAINT_NAME = 'fk_project_progress_quote'
  ),
  'DO 0',
  'ALTER TABLE project_progress ADD CONSTRAINT fk_project_progress_quote FOREIGN KEY (quote_id) REFERENCES project_quotes (id) ON DELETE SET NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @migration_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_progress'
      AND CONSTRAINT_NAME = 'fk_project_progress_supplier'
  ),
  'DO 0',
  'ALTER TABLE project_progress ADD CONSTRAINT fk_project_progress_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL'
);
PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

UPDATE project_progress pp
INNER JOIN projects p ON p.id = pp.project_id
INNER JOIN project_quotes pq ON pq.id = p.selected_quote_id
INNER JOIN suppliers s ON s.id = pq.supplier_id
SET
  pp.quote_id = pq.id,
  pp.supplier_id = s.id,
  pp.supplier_name = s.name
WHERE pp.quote_id IS NULL;
