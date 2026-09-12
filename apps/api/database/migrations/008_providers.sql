CREATE TABLE IF NOT EXISTS providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(40),
  address VARCHAR(255),
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_providers_name (name)
);

ALTER TABLE assets
  ADD COLUMN provider_id BIGINT UNSIGNED NULL AFTER location,
  ADD KEY idx_assets_provider (provider_id),
  ADD CONSTRAINT fk_assets_provider FOREIGN KEY (provider_id) REFERENCES providers (id);
