CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED,
  building_id BIGINT UNSIGNED,
  metadata JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_user (user_id),
  KEY idx_audit_logs_created (created_at),
  KEY idx_audit_logs_entity (entity, entity_id),
  KEY idx_audit_logs_building (building_id),
  KEY idx_audit_logs_module (module),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_audit_logs_building FOREIGN KEY (building_id) REFERENCES buildings (id)
) ENGINE=InnoDB
