CREATE TABLE IF NOT EXISTS profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profile_permissions (
  profile_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id, permission_id),
  CONSTRAINT fk_profile_permissions_profile FOREIGN KEY (profile_id) REFERENCES profiles (id),
  CONSTRAINT fk_profile_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id)
) ENGINE=InnoDB;

INSERT INTO permissions (code, name) VALUES
  ('buildings.list', 'Listar edificios'),
  ('buildings.read', 'Consultar detalle de edificio'),
  ('buildings.create', 'Registrar edificio'),
  ('buildings.update', 'Actualizar edificio')
ON DUPLICATE KEY UPDATE code = VALUES(code);
