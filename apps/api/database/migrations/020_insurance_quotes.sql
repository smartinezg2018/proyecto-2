CREATE TABLE IF NOT EXISTS insurance_quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  insurer VARCHAR(150) NOT NULL,
  coverage TEXT NOT NULL,
  premium DECIMAL(15, 2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  document_ref VARCHAR(255),
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_insurance_quotes_building_premium (building_id, premium),
  CONSTRAINT fk_insurance_quotes_building FOREIGN KEY (building_id) REFERENCES buildings (id)
);

INSERT INTO permissions (code, name) VALUES
  ('insurance.quotes.create', 'Registrar cotizaciones de seguros'),
  ('insurance.quotes.view', 'Consultar cotizaciones de seguros'),
  ('insurance.update', 'Actualizar información de seguros')
ON DUPLICATE KEY UPDATE name = VALUES(name);