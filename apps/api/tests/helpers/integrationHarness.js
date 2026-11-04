import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

export async function createIntegrationHarness(label) {
  const databaseName = `test_${label}_${randomUUID().replaceAll('-', '')}`;
  const config = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 3306),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || 'root_password',
    connectTimeout: 5000
  };
  const owner = await mysql.createConnection(config);
  await owner.query(
    `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  Object.assign(process.env, {
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USER: config.user,
    DB_PASSWORD: config.password,
    DB_NAME: databaseName
  });
  const apiRoot = new URL('../../', import.meta.url);
  for (const script of ['database/migrations/run.js', 'database/seeds/run.js']) {
    execFileSync(process.execPath, [fileURLToPath(new URL(script, apiRoot))], {
      env: process.env,
      stdio: 'pipe',
      timeout: 30000,
      windowsHide: true
    });
  }
  const [{ app }, connection] = await Promise.all([
    import('../../src/app.js'),
    import('../../database/connection.js')
  ]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, { method = 'GET', body, cookie, raw = false } = {}) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    const payload =
      raw || !response.headers.get('content-type')?.includes('json')
        ? text
        : text
          ? JSON.parse(text)
          : null;
    return { status: response.status, payload, headers: response.headers };
  }

  async function login(email = 'admin@example.com', password = 'Admin123!') {
    const response = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    assert.equal(response.status, 200, JSON.stringify(response.payload));
    return response.headers.get('set-cookie').split(';')[0];
  }

  async function ids() {
    const [buildings] = await connection.database.query(
      'SELECT id, nit FROM buildings ORDER BY id'
    );
    const [users] = await connection.database.query('SELECT id, email FROM users ORDER BY id');
    return { buildings, users };
  }

  async function close() {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await connection.database.end();
    await connection.sequelize.close();
    await owner.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await owner.end();
  }

  return { ...connection, request, login, ids, close, databaseName };
}
