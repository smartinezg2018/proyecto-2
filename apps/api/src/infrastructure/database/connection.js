import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';

export const database = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});
