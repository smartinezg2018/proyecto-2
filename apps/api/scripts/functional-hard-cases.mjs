import assert from 'node:assert/strict';

const { app } = await import('../src/app.js');
const { database, sequelize } = await import('../database/connection.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return {
    status: response.status,
    payload: await response.json(),
    cookie: response.headers.get('set-cookie')
  };
}

const login = await request('/api/v1/auth/login', {
  method: 'POST',
  body: { email: 'admin@example.com', password: 'Admin123!' }
});
assert.equal(login.status, 200);
const cookie = login.cookie.split(';')[0];
const buildings = await request('/api/v1/administration/buildings', { cookie });
const building = buildings.payload.data.find((item) => item.nit === '900111001');
const suffix = Date.now();

const cases = [
  {
    id: 'CP-005-04',
    expected: 400,
    execute: () =>
      request('/api/v1/administration/users', {
        method: 'POST',
        cookie,
        body: {
          identification: `EMAIL-${suffix}`,
          name: 'Usuario Correo Inválido',
          email: `correo-sin-formato-${suffix}`,
          status: 'active'
        }
      })
  },
  {
    id: 'CP-012-03',
    expected: 400,
    execute: () =>
      request(`/api/v1/assets/buildings/${building.id}/assets`, {
        method: 'POST',
        cookie,
        body: {
          code: `ACT-FECHA-${suffix}`,
          name: 'Activo con fecha imposible',
          description: 'Validación de calendario',
          type: 'otro',
          status: 'activo',
          location: 'Pruebas',
          acquisitionDate: '2026-02-31'
        }
      })
  }
];

const results = [];
try {
  for (const testCase of cases) {
    const response = await testCase.execute();
    results.push({
      id: testCase.id,
      expectedStatus: testCase.expected,
      actualStatus: response.status,
      status: response.status === testCase.expected ? 'APROBADO' : 'FALLIDO'
    });
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.end();
  await sequelize.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status === 'FALLIDO')) process.exitCode = 1;
