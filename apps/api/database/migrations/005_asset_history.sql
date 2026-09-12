CREATE TABLE IF NOT EXISTS asset_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id BIGINT UNSIGNED NOT NULL,
  change_type VARCHAR(30) NOT NULL,
  field VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  reason VARCHAR(255),
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asset_history_asset_created (asset_id, created_at),
  CONSTRAINT fk_asset_history_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
);
