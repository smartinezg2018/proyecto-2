CREATE TABLE IF NOT EXISTS user_buildings (
  user_id BIGINT UNSIGNED NOT NULL,
  building_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, building_id),
  CONSTRAINT fk_user_buildings_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_buildings_building FOREIGN KEY (building_id) REFERENCES buildings (id)
) ENGINE=InnoDB
