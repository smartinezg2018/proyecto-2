CREATE TABLE IF NOT EXISTS maintenances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id BIGINT UNSIGNED NOT NULL,
  building_id BIGINT UNSIGNED NOT NULL,
  maintenance_type VARCHAR(30) NOT NULL,
  maintenance_date DATE NOT NULL,
  description TEXT NULL,
  failure_description TEXT NULL,
  cause TEXT NULL,
  actions_taken TEXT NULL,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_maintenances_asset_date (asset_id, maintenance_date),
  KEY idx_maintenances_building_date (building_id, maintenance_date),
  CONSTRAINT fk_maintenances_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
);

INSERT INTO permissions (code, name) VALUES
  ('maintenance.create', 'Registrar mantenimientos')
ON DUPLICATE KEY UPDATE name = VALUES(name)
