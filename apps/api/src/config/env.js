import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.API_PORT || 5000),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'building_management',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'app_password'
  }
};
