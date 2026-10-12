CREATE TABLE IF NOT EXISTS insurance_policies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  building_id BIGINT UNSIGNED NOT NULL,
  number VARCHAR(100) NOT NULL,
  insurer VARCHAR(150) NOT NULL,
  coverage TEXT NOT NULL,
  insured_value DECIMAL(15,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_policy_number (building_id, insurer, number),
  KEY idx_policy_expiration (building_id, valid_until),
  FOREIGN KEY (building_id) REFERENCES buildings(id)
);

CREATE TABLE IF NOT EXISTS insurance_alert_settings (
  building_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  alert_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  updated_by BIGINT UNSIGNED,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES buildings(id),
  CHECK (alert_days <= 365)
);
