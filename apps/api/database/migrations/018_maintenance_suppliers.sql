ALTER TABLE maintenances
  ADD COLUMN supplier_id BIGINT UNSIGNED NULL AFTER building_id,
  ADD COLUMN supplier_document_ref VARCHAR(255) NULL AFTER supplier_id,
  ADD KEY idx_maintenances_supplier (supplier_id),
  ADD CONSTRAINT fk_maintenances_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id);