CREATE TABLE IF NOT EXISTS persons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identification VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_persons_identification (identification)
);

CREATE TABLE IF NOT EXISTS unit_responsibles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id BIGINT UNSIGNED NOT NULL,
  person_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unit_responsibles_unit (unit_id),
  KEY idx_unit_responsibles_person (person_id),
  CONSTRAINT fk_unit_responsibles_unit FOREIGN KEY (unit_id) REFERENCES units (id),
  CONSTRAINT fk_unit_responsibles_person FOREIGN KEY (person_id) REFERENCES persons (id)
);
