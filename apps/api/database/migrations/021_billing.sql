CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  payment_reference VARCHAR(50) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_unit_period (unit_id, period),
  KEY idx_invoices_building_period (building_id, period),
  CONSTRAINT fk_invoices_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_invoices_unit FOREIGN KEY (unit_id) REFERENCES units (id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  concept VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS charge_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  charge_type VARCHAR(20) NOT NULL,
  origin_period CHAR(7) NOT NULL,
  scheduled_period CHAR(7) NOT NULL,
  concept VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  approval_reference VARCHAR(255),
  invoice_id BIGINT UNSIGNED,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_charge_schedules_unit_period (unit_id, scheduled_period),
  CONSTRAINT fk_charge_schedules_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_charge_schedules_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT fk_charge_schedules_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE SET NULL
);

INSERT INTO permissions (code, name) VALUES
  ('billing.invoice.create', 'Generar facturas'),
  ('billing.invoice.view', 'Consultar facturas'),
  ('billing.charge.create', 'Generar cobros')
ON DUPLICATE KEY UPDATE name = VALUES(name);
