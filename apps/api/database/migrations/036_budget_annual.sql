CREATE TABLE IF NOT EXISTS annual_budgets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'borrador',
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_annual_budgets_building_year_version (building_id, year, version),
  KEY idx_annual_budgets_building_year (building_id, year),
  CONSTRAINT fk_annual_budgets_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT chk_annual_budgets_status CHECK (status IN ('borrador', 'aprobado', 'cerrado'))
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  budget_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  classification VARCHAR(20) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget_lines_budget_code (budget_id, code),
  KEY idx_budget_lines_budget (budget_id),
  CONSTRAINT fk_budget_lines_budget FOREIGN KEY (budget_id) REFERENCES annual_budgets (id) ON DELETE CASCADE,
  CONSTRAINT chk_budget_lines_classification CHECK (classification IN ('ingreso', 'gasto')),
  CONSTRAINT chk_budget_lines_amount CHECK (amount >= 0)
);

INSERT INTO permissions (code, name) VALUES
  ('budget.update', 'Actualizar presupuesto')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.name = 'Administrador de edificio'
  AND perm.code = 'budget.update'
  AND NOT EXISTS (
    SELECT 1
    FROM profile_permissions pp
    WHERE pp.profile_id = p.id
      AND pp.permission_id = perm.id
  );
