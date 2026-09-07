import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database } from '../../src/infrastructure/database/connection.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migration = await fs.readFile(path.join(currentDirectory, '001_initial.sql'), 'utf8');

try {
  await database.query(migration);
  console.log('Database migrations completed.');
} finally {
  await database.end();
}
