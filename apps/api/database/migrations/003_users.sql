CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identification VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_by BIGINT UNSIGNED,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_identification (identification),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive'))
) ENGINE=InnoDB;
