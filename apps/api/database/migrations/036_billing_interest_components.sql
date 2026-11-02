SET @invoice_item_type_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'invoice_items'
    AND column_name = 'item_type'
);

SET @invoice_item_type_sql = IF(
  @invoice_item_type_exists = 0,
  "ALTER TABLE invoice_items ADD COLUMN item_type ENUM('capital', 'other') NOT NULL DEFAULT 'capital' AFTER concept",
  'SELECT 1'
);

PREPARE invoice_item_type_statement FROM @invoice_item_type_sql;
EXECUTE invoice_item_type_statement;
DEALLOCATE PREPARE invoice_item_type_statement;
