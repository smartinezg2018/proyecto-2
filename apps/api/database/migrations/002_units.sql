CREATE TABLE IF NOT EXISTS units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  number VARCHAR(50) NOT NULL,
  tower VARCHAR(50) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL DEFAULT 'apartamento',
  coefficient DECIMAL(10, 6) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_building_number_tower (building_id, number, tower),
  KEY idx_units_building (building_id),
  CONSTRAINT fk_units_building FOREIGN KEY (building_id) REFERENCES buildings (id)
);
