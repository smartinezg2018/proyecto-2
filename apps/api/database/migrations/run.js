import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database } from '../../src/infrastructure/database/connection.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
try {
  for (const filename of ['001_initial.sql', '002_profiles.sql', '003_users.sql']) {
    const migration = await fs.readFile(path.join(currentDirectory, filename), 'utf8');
    for (const statement of migration.split(';').filter((sql) => sql.trim())) {
      await database.query(statement);
    }
  }
  console.log('Database migrations completed.');
} finally {
  await database.end();
}
