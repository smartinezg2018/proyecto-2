ALTER TABLE projects
  ADD COLUMN close_date DATE NULL,
  ADD COLUMN total_cost DECIMAL(15, 2) NULL,
  ADD COLUMN result TEXT NULL,
  ADD COLUMN closing_document_ref VARCHAR(255) NULL;
