CREATE TABLE IF NOT EXISTS project_quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  valid_until DATE NOT NULL,
  scope TEXT NOT NULL,
  document_ref VARCHAR(255),
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_quotes_project (project_id, amount),
  CONSTRAINT fk_project_quotes_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_project_quotes_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);
