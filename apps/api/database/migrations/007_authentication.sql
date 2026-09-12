SET @password_column_exists = (
	SELECT COUNT(*)
	FROM information_schema.columns
	WHERE table_schema = DATABASE()
		AND table_name = 'users'
		AND column_name = 'password_hash'
);
SET @password_column_sql = IF(
	@password_column_exists = 0,
	'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER status',
	'SELECT 1'
);
PREPARE add_password_column FROM @password_column_sql;
EXECUTE add_password_column;
DEALLOCATE PREPARE add_password_column;