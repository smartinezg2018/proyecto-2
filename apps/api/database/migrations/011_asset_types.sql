CREATE TABLE IF NOT EXISTS asset_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_asset_types_code (code)
);

INSERT IGNORE INTO asset_types (code, name) VALUES
  ('electromecanico', 'Electromecánico'),
  ('electrico', 'Eléctrico'),
  ('hidraulico', 'Hidráulico'),
  ('seguridad', 'Seguridad'),
  ('accesos', 'Accesos'),
  ('emergencias', 'Emergencias'),
  ('otro', 'Otro');
