CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  objective TEXT NOT NULL,
  project_type VARCHAR(30) NOT NULL,
  budget DECIMAL(15, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  responsible VARCHAR(150) NOT NULL,
  approval_reference VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'aprobado',
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_building_status (building_id, status),
  KEY idx_projects_dates (start_date, end_date),
  CONSTRAINT fk_projects_building FOREIGN KEY (building_id) REFERENCES buildings (id)
);

INSERT INTO permissions (code, name) VALUES
  ('projects.create', 'Registrar proyectos'),
  ('projects.update', 'Actualizar proyectos')
ON DUPLICATE KEY UPDATE name = VALUES(name);
