import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';
import { UserRepository } from '../src/modules/administration/infrastructure/userRepository.js';
import { BuildingRepository } from '../src/modules/administration/infrastructure/buildingRepository.js';
import { AssetRepository } from '../src/modules/assets/infrastructure/assetRepository.js';
import { AuthorizationRepository } from '../src/modules/auth/infrastructure/authorizationRepository.js';
import { sessionStore } from '../src/modules/auth/infrastructure/sessionStore.js';
import { InsuranceClaimRepository } from '../src/modules/insurance/infrastructure/insuranceClaimRepository.js';
import { InsurancePolicyRepository } from '../src/modules/insurance/infrastructure/insurancePolicyRepository.js';
import { ClaimDocumentStorage } from '../src/modules/insurance/infrastructure/claimDocumentStorage.js';
import { readFile } from 'node:fs/promises';

test('HU-038 HTTP: sesión, permisos, edificio y registro de reclamación', async (t) => {
  let permissions = ['insurance.view', 'insurance.update'];
  const claims = [];
  const storage = new ClaimDocumentStorage();
  t.mock.method(UserRepository.prototype, 'findById', async () => ({ id: 7, status: 'active' }));
  t.mock.method(
    AuthorizationRepository.prototype,
    'findEffectivePermissions',
    async () => permissions
  );
  t.mock.method(
    AuthorizationRepository.prototype,
    'hasBuildingAccess',
    async (_user, id) => id === 1
  );
  t.mock.method(BuildingRepository.prototype, 'findById', async () => ({ id: 1 }));
  t.mock.method(InsurancePolicyRepository.prototype, 'findById', async () => ({
    id: 10,
    buildingId: 1
  }));
  t.mock.method(AssetRepository.prototype, 'findById', async () => ({ id: 20, buildingId: 1 }));
  t.mock.method(InsuranceClaimRepository.prototype, 'findByBuilding', async () => claims);
  t.mock.method(InsuranceClaimRepository.prototype, 'create', async (input) => {
    const claim = { id: 1, ...input };
    claims.push(claim);
    return claim;
  });
  t.mock.method(
    InsuranceClaimRepository.prototype,
    'findDocument',
    async (buildingId, claimId, documentId) => {
      const claim = claims.find(
        (item) => String(item.id) === claimId && String(item.buildingId) === buildingId
      );
      return claim?.documents.find((document) => document.id === documentId) ?? null;
    }
  );

  const session = sessionStore.create(7);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/v1/insurance/buildings`;
  const body = {
    policyId: 10,
    claimDate: '2020-01-01',
    description: 'Daño',
    status: 'reportada',
    claimedAmount: 1000,
    documentRefs: ['acta.pdf'],
    assetIds: [20]
  };
  async function request(path, method = 'GET', payload, authenticated = true) {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated ? { Cookie: `building_management_session=${session}` } : {})
      },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    return { status: response.status, payload: await response.json() };
  }
  try {
    const pdf = Buffer.from('%PDF-1.4\n% test document\n%%EOF');
    async function upload({
      content = pdf,
      name = 'acta.pdf',
      type = 'application/pdf',
      count = 1,
      header = true,
      authenticated = true,
      building = 1
    } = {}) {
      const data = new FormData();
      data.append('payload', JSON.stringify(body));
      for (let i = 0; i < count; i += 1)
        data.append('documents', new Blob([content], { type }), name);
      const response = await fetch(`${base}/${building}/claims`, {
        method: 'POST',
        body: data,
        headers: {
          ...(header ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
          ...(authenticated ? { Cookie: `building_management_session=${session}` } : {})
        }
      });
      return { status: response.status, payload: await response.json() };
    }
    assert.equal((await upload({ authenticated: false })).status, 401);
    assert.equal((await upload({ building: 2 })).status, 403);
    assert.equal((await upload({ header: false })).status, 403);
    assert.equal((await upload({ name: 'attack.html', type: 'text/html' })).status, 400);
    assert.equal((await upload({ content: '<script>alert(1)</script>' })).status, 400);
    assert.equal((await upload({ content: Buffer.alloc(5 * 1024 * 1024 + 1) })).status, 413);
    assert.equal((await upload({ count: 6 })).status, 400);
    const registered = await upload();
    assert.equal(registered.status, 201, JSON.stringify(registered.payload));
    const document = registered.payload.data.documents[0];
    assert.deepEqual(await readFile(storage.filePath(document.id)), pdf);
    const url = `${base}/1/claims/1/documents/${document.id}`;
    const download = await fetch(url, {
      headers: { Cookie: `building_management_session=${session}` }
    });
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-disposition'), /^attachment/);
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(download.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
    assert.equal((await fetch(url)).status, 401);
    assert.equal(
      (
        await fetch(url.replace('/claims/1/', '/claims/999/'), {
          headers: { Cookie: `building_management_session=${session}` }
        })
      ).status,
      404
    );
    assert.equal(
      (
        await fetch(url.replace('/buildings/1/', '/buildings/2/'), {
          headers: { Cookie: `building_management_session=${session}` }
        })
      ).status,
      403
    );
    assert.equal((await request('/1/claims', 'GET', undefined, false)).status, 401);
    assert.equal((await request('/2/claims')).status, 403);
    assert.equal((await request('/1/claims', 'POST', { ...body, assetIds: [] })).status, 400);
    assert.equal((await request('/1/claims', 'POST', body)).status, 201);
    assert.equal((await request('/1/claims')).payload.data.length, 2);
    permissions = ['insurance.view'];
    assert.equal((await request('/1/claims')).status, 200);
    assert.equal((await request('/1/claims', 'POST', body)).status, 403);
    permissions = [];
    assert.equal(
      (await fetch(url, { headers: { Cookie: `building_management_session=${session}` } })).status,
      403
    );
    assert.equal((await request('/1/claims')).status, 403);
  } finally {
    await storage.remove(claims.flatMap((claim) => claim.documents ?? []));
    sessionStore.delete(session);
    await new Promise((resolve) => server.close(resolve));
  }
});
