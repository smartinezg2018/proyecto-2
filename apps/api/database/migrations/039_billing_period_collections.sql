CREATE TABLE IF NOT EXISTS billing_period_marks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,
  status VARCHAR(20) NOT NULL,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_period_marks_unit_period (unit_id, period),
  KEY idx_billing_period_marks_building_period (building_id, period),
  CONSTRAINT fk_billing_period_marks_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_billing_period_marks_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT chk_billing_period_marks_status CHECK (status IN ('pagado', 'no_pagado'))
);

CREATE TABLE IF NOT EXISTS unit_fines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_unit_fines_building_period (building_id, period),
  KEY idx_unit_fines_unit_period (unit_id, period),
  CONSTRAINT fk_unit_fines_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_unit_fines_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT chk_unit_fines_status CHECK (status IN ('pendiente', 'pagada'))
);

CREATE TABLE IF NOT EXISTS billing_extra_charges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_billing_extra_charges_building_period (building_id, period),
  KEY idx_billing_extra_charges_unit_period (unit_id, period),
  CONSTRAINT fk_billing_extra_charges_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_billing_extra_charges_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT chk_billing_extra_charges_status CHECK (status IN ('pendiente', 'pagada'))
);
