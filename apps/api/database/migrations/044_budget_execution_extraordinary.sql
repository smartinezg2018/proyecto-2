ALTER TABLE budget_executions
  ADD COLUMN is_extraordinary TINYINT(1) NOT NULL DEFAULT 0 AFTER description;
