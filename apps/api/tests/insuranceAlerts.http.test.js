import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';
import { BuildingRepository } from '../src/modules/administration/infrastructure/buildingRepository.js';
import { AuthorizationRepository } from '../src/modules/auth/infrastructure/authorizationRepository.js';
import { sessionStore } from '../src/modules/auth/infrastructure/sessionStore.js';
import { InsurancePolicyRepository } from '../src/modules/insurance/infrastructure/insurancePolicyRepository.js';

test('HU-037 HTTP: sesión, permisos, edificio, configuración y registro', async (t) => {
  let permissions = ['insurance.view', 'insurance.update'];
  const settings = new Map();
  const policies = [];
  t.mock.method(UserRepository.prototype, 'findById', async () => ({ id: 7, status: 'active' }));
  t.mock.method(
    AuthorizationRepository.prototype,
    'findEffectivePermissions',
    async () => permissions
  );
  t.mock.method(
    AuthorizationRepository.prototype,
    'hasBuildingAccess',
    async (_userId, id) => id === 1
  );
  t.mock.method(BuildingRepository.prototype, 'findById', async () => ({ id: 1 }));
  t.mock.method(
    InsurancePolicyRepository.prototype,
    'getSettings',
    async (id) => settings.get(id) ?? { alertDays: 30 }
  );
  t.mock.method(InsurancePolicyRepository.prototype, 'saveSettings', async (id, alertDays) => {
    settings.set(id, { alertDays });
    return { alertDays };
  });
  t.mock.method(InsurancePolicyRepository.prototype, 'findByBuilding', async () => policies);
  t.mock.method(InsurancePolicyRepository.prototype, 'create', async (buildingId, input) => {
    const policy = { id: 1, buildingId, ...input };
    policies.push(policy);
    return policy;
  });
  const session = sessionStore.create(7);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/v1/insurance/buildings`;
  async function request(path, method = 'GET', body, authenticated = true) {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated ? { Cookie: `building_management_session=${session}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, payload: await response.json() };
  }
  try {
    assert.equal((await request('/1/policies', 'GET', undefined, false)).status, 401);
    assert.equal((await request('/2/policies')).status, 403);
    assert.equal((await request('/2/alert-settings', 'PUT', { alertDays: 10 })).status, 403);
    assert.equal((await request('/0/policies')).status, 400);
    assert.deepEqual((await request('/1/alert-settings')).payload.data, { alertDays: 30 });
    assert.equal((await request('/1/alert-settings', 'PUT', { alertDays: 366 })).status, 400);
    assert.equal((await request('/1/alert-settings', 'PUT', { alertDays: 0 })).status, 200);
    assert.deepEqual((await request('/1/alert-settings')).payload.data, { alertDays: 0 });
    const policy = {
      number: 'P1',
      insurer: 'Seguros',
      coverage: 'Incendio',
      insuredValue: 1000,
      validFrom: '2020-01-01',
      validUntil: '2021-01-01'
    };
    assert.equal(
      (await request('/1/policies', 'POST', { ...policy, validUntil: '2020-02-30' })).status,
      400
    );
    assert.equal((await request('/1/policies', 'POST', policy)).status, 201);
    assert.equal((await request('/1/policies')).payload.data[0].expirationStatus, 'Vencida');
    permissions = ['insurance.view'];
    assert.equal((await request('/1/policies')).status, 200);
    assert.equal((await request('/1/policies', 'POST', policy)).status, 403);
    assert.equal((await request('/1/alert-settings', 'PUT', { alertDays: 30 })).status, 403);
    permissions = [];
    assert.equal((await request('/1/policies')).status, 403);
  } finally {
    sessionStore.delete(session);
    await new Promise((resolve) => server.close(resolve));
  }
});
