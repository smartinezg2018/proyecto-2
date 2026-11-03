import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database, sequelize } from '../connection.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const files = (await fs.readdir(currentDirectory))
  .filter((name) => name.endsWith('.sql'))
  .sort();

function splitStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

let connection;
try {
  connection = await database.getConnection();

  // Ensure the migrations tracking table exists.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    )
  `);

  const [appliedRows] = await connection.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.filename));

  let appliedCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const migration = await fs.readFile(path.join(currentDirectory, file), 'utf8');
    for (const statement of splitStatements(migration)) {
      await connection.query(statement);
    }
    await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log(`Applied ${file}`);
    appliedCount += 1;
  }

  if (appliedCount === 0) {
    console.log('No pending migrations. Database is up to date.');
  } else {
    console.log(`Database migrations completed. Applied ${appliedCount} migration(s).`);
  }
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
