CREATE TABLE IF NOT EXISTS billing_interest_settings (
  building_id BIGINT UNSIGNED NOT NULL,
  annual_rate DECIMAL(7, 4) NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (building_id),
  CONSTRAINT fk_billing_interest_settings_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_billing_interest_settings_user FOREIGN KEY (updated_by) REFERENCES users (id),
  CONSTRAINT chk_billing_interest_settings_rate CHECK (annual_rate >= 0 AND annual_rate <= 100)
);
