import mysql from 'mysql2';
import mysqlPromise from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import { env } from '../src/config/env.js';

const databaseConfig = {
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password
};

export const database = mysqlPromise.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

export const sequelize = new Sequelize(
  databaseConfig.database,
  databaseConfig.user,
  databaseConfig.password,
  {
    host: databaseConfig.host,
    port: databaseConfig.port,
    dialect: 'mysql',
    dialectModule: mysql,
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true
    }
  }
);
