CREATE TABLE IF NOT EXISTS policy_assets (
  policy_id BIGINT UNSIGNED NOT NULL,
  asset_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (policy_id, asset_id),
  KEY idx_policy_assets_asset (asset_id),
  CONSTRAINT fk_policy_assets_policy FOREIGN KEY (policy_id) REFERENCES insurance_policies (id),
  CONSTRAINT fk_policy_assets_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
);
