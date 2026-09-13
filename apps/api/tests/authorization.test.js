import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePermission } from '../src/modules/auth/presentation/http/middleware/requirePermission.js';
import { createEnsureBuildingAccess } from '../src/modules/auth/presentation/http/middleware/ensureBuildingAccess.js';

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
    }
  };
}

test('requirePermission permite pasar cuando el permiso está presente', () => {
  const middleware = requirePermission('audit.read');
  const response = makeResponse();
  let called = false;
  middleware({ user: { permissions: ['audit.read'] } }, response, () => (called = true));
  assert.equal(called, true);
  assert.equal(response.statusCode, 200);
});

test('requirePermission permite el bypass con admin.all', () => {
  const middleware = requirePermission('users.assign_profiles');
  const response = makeResponse();
  let called = false;
  middleware({ user: { permissions: ['admin.all'] } }, response, () => (called = true));
  assert.equal(called, true);
});

test('requirePermission responde 403 cuando falta el permiso', () => {
  const middleware = requirePermission('audit.read');
  const response = makeResponse();
  middleware({ user: { permissions: [] }, id: 'r1' }, response, () => {
    throw new Error('no debería llamarse');
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('ensureBuildingAccess rechaza acceso cuando no está asignado', async () => {
  const middleware = createEnsureBuildingAccess({
    authorization: { async hasBuildingAccess() { return false; } }
  });
  const response = makeResponse();
  await middleware(
    { user: { id: 1, permissions: [] }, params: { buildingId: '5' }, id: 'r1' },
    response,
    () => {
      throw new Error('no debería llamarse');
    }
  );
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, 'BUILDING_FORBIDDEN');
});

test('ensureBuildingAccess permite acceso cuando el usuario tiene admin.all', async () => {
  const middleware = createEnsureBuildingAccess({
    authorization: {
      async hasBuildingAccess() {
        throw new Error('no debería consultarse');
      }
    }
  });
  const response = makeResponse();
  let called = false;
  await middleware(
    { user: { id: 1, permissions: ['admin.all'] }, params: { buildingId: '5' }, id: 'r1' },
    response,
    () => (called = true)
  );
  assert.equal(called, true);
});
