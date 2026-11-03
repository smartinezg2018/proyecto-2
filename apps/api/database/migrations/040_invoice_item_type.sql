ALTER TABLE invoice_items
  ADD COLUMN item_type ENUM('capital', 'other') NOT NULL DEFAULT 'capital' AFTER concept;
