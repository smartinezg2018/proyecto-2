CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  profile_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, profile_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_profiles_profile FOREIGN KEY (profile_id) REFERENCES profiles (id)
) ENGINE=InnoDB
