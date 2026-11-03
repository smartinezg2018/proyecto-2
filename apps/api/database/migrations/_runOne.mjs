import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database, sequelize } from '../connection.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
if (!target) {
  console.error('Usage: node _runOne.mjs <migration-file.sql>');
  process.exit(1);
}

function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

let connection;
try {
  connection = await database.getConnection();
  const sql = await fs.readFile(path.join(currentDirectory, target), 'utf8');
  for (const statement of splitStatements(sql)) {
    await connection.query(statement);
  }
  console.log(`Applied ${target}`);
} finally {
  connection?.release();
  await database.end();
  await sequelize.close();
}
