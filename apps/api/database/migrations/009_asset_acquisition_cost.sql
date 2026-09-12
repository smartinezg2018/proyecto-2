ALTER TABLE assets
  ADD COLUMN acquisition_cost DECIMAL(15, 2) NULL AFTER acquisition_date,
  ADD COLUMN acquisition_document VARCHAR(150) NULL AFTER acquisition_cost;
