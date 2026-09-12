import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database, sequelize } from '../connection.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const files = (await fs.readdir(currentDirectory)).filter((name) => name.endsWith('.sql')).sort();

function splitStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

let connection;
try {
  connection = await database.getConnection();
  for (const file of files) {
    const migration = await fs.readFile(path.join(currentDirectory, file), 'utf8');
    for (const statement of splitStatements(migration)) {
      await connection.query(statement);
    }
    console.log(`Applied ${file}`);
  }
  console.log('Database migrations completed.');
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
