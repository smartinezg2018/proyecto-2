import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database, sequelize } from '../connection.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const files = (await fs.readdir(currentDirectory))
  .filter((name) => name.endsWith('.sql'))
  .sort();

let connection;
try {
  connection = await database.getConnection();

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    )
  `);

  for (const file of files) {
    await connection.query(
      'INSERT IGNORE INTO schema_migrations (filename) VALUES (?)',
      [file]
    );
  }

  const [rows] = await connection.query(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );
  console.log(`Tracked ${rows.length} migration(s) as applied.`);
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
