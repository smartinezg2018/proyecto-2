CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identification VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_identification (identification)
);

CREATE TABLE IF NOT EXISTS asset_suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'suministro',
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_asset_suppliers_asset (asset_id),
  KEY idx_asset_suppliers_supplier (supplier_id),
  CONSTRAINT fk_asset_suppliers_asset FOREIGN KEY (asset_id) REFERENCES assets (id),
  CONSTRAINT fk_asset_suppliers_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

CREATE TABLE IF NOT EXISTS asset_costs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id BIGINT UNSIGNED NOT NULL,
  cost_type VARCHAR(30) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  cost_date DATE NOT NULL,
  document_ref VARCHAR(255),
  notes TEXT,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asset_costs_asset_type_date (asset_id, cost_type, cost_date),
  CONSTRAINT fk_asset_costs_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
);
