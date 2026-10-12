CREATE TABLE IF NOT EXISTS insurance_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  policy_id BIGINT UNSIGNED NOT NULL,
  claim_date DATE NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL,
  claimed_amount DECIMAL(15, 2) NOT NULL,
  document_refs JSON NOT NULL,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_insurance_claims_building_date (building_id, claim_date),
  KEY idx_insurance_claims_policy (policy_id),
  CONSTRAINT fk_insurance_claims_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_insurance_claims_policy FOREIGN KEY (policy_id) REFERENCES insurance_policies (id),
  CHECK (status IN ('reportada', 'en_revision', 'aprobada', 'rechazada', 'indemnizada')),
  CHECK (claimed_amount >= 0)
);

CREATE TABLE IF NOT EXISTS insurance_claim_assets (
  claim_id BIGINT UNSIGNED NOT NULL,
  asset_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (claim_id, asset_id),
  KEY idx_insurance_claim_assets_asset (asset_id),
  CONSTRAINT fk_insurance_claim_assets_claim FOREIGN KEY (claim_id) REFERENCES insurance_claims (id),
  CONSTRAINT fk_insurance_claim_assets_asset FOREIGN KEY (asset_id) REFERENCES assets (id)
);
