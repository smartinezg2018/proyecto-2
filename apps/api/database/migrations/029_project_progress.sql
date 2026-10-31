CREATE TABLE IF NOT EXISTS project_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  progress_date DATE NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  executed_cost DECIMAL(15, 2) NOT NULL,
  observations TEXT NOT NULL,
  evidence_ref VARCHAR(255),
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_progress_project_date (project_id, progress_date, id),
  CONSTRAINT fk_project_progress_project FOREIGN KEY (project_id) REFERENCES projects (id)
);
