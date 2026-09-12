CREATE TABLE IF NOT EXISTS asset_costs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  occurred_on DATE NOT NULL,
  description TEXT,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asset_costs_asset (asset_id),
  KEY idx_asset_costs_type (type),
  KEY idx_asset_costs_occurred_on (occurred_on),
  CONSTRAINT fk_asset_costs_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
);
