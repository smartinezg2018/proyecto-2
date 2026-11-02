CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  reference VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'registrado',
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_building_reference (building_id, reference),
  KEY idx_payments_unit_date (unit_id, payment_date),
  CONSTRAINT fk_payments_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_payments_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT chk_payments_amount CHECK (amount > 0),
  CONSTRAINT chk_payments_status CHECK (status IN ('registrado', 'aplicado', 'reversado'))
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_allocations_payment_invoice (payment_id, invoice_id),
  KEY idx_payment_allocations_invoice (invoice_id),
  CONSTRAINT fk_payment_allocations_payment FOREIGN KEY (payment_id) REFERENCES payments (id),
  CONSTRAINT fk_payment_allocations_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT chk_payment_allocations_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS late_interests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  calculation_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_late_interests_invoice_date (invoice_id, calculation_date),
  KEY idx_late_interests_invoice (invoice_id),
  CONSTRAINT fk_late_interests_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT chk_late_interests_amount CHECK (amount >= 0),
  CONSTRAINT chk_late_interests_status CHECK (status IN ('pendiente', 'pagado', 'reversado'))
);
