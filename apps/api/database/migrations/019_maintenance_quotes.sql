CREATE TABLE IF NOT EXISTS maintenance_quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  maintenance_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  valid_until DATE NOT NULL,
  document_ref VARCHAR(255),
  scope TEXT NOT NULL,
  conditions TEXT NOT NULL,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_maintenance_quotes_maintenance (maintenance_id, amount),
  CONSTRAINT fk_maintenance_quotes_maintenance FOREIGN KEY (maintenance_id) REFERENCES maintenances (id),
  CONSTRAINT fk_maintenance_quotes_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

INSERT INTO permissions (code, name) VALUES
  ('maintenance.quotes.create', 'Registrar cotizaciones de mantenimiento'),
  ('maintenance.quotes.view', 'Consultar cotizaciones de mantenimiento')
ON DUPLICATE KEY UPDATE name = VALUES(name);