import assert from 'node:assert/strict';
import test, { after, describe } from 'node:test';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import { ClaimDocumentStorage } from '../src/modules/insurance/infrastructure/claimDocumentStorage.js';

describe('Sprint - pruebas funcionales de API', { concurrency: false }, async () => {
  // A fresh database per run prevents duplicate fixtures and protects application data.
  const testDatabase = 'codex_sprint2_' + randomUUID().replaceAll('-', '');
  const testConfig = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 3306),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || 'root_password',
    connectTimeout: 5000
  };
  let owner;
  let databaseCreated = false;
  let server;
  let database;
  let sequelize;
  const uploadedDocuments = [];
  after(async () => {
    try {
      await new ClaimDocumentStorage().remove(uploadedDocuments);
      if (server?.listening) await new Promise((resolve) => server.close(resolve));
      if (database) await database.end();
      if (sequelize) await sequelize.close();
    } finally {
      try {
        if (databaseCreated) await owner.query('DROP DATABASE ' + testDatabase);
      } finally {
        if (owner) await owner.end();
      }
    }
  });
  try {
    owner = await mysql.createConnection(testConfig);
  } catch (error) {
    throw new Error(
      'No se pudo conectar a MySQL de pruebas. Ejecuta docker compose up -d mysql. ' +
        'Para otro servidor configura TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER y TEST_DB_PASSWORD.',
      { cause: error }
    );
  }
  await owner.query(
    'CREATE DATABASE ' + testDatabase + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  databaseCreated = true;
  Object.assign(process.env, {
    DB_HOST: testConfig.host,
    DB_PORT: String(testConfig.port),
    DB_USER: testConfig.user,
    DB_PASSWORD: testConfig.password,
    DB_NAME: testDatabase
  });
  for (const relativePath of ['../database/migrations/run.js', '../database/seeds/run.js']) {
    execFileSync(process.execPath, [fileURLToPath(new URL(relativePath, import.meta.url))], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
      windowsHide: true
    });
  }

  const { app } = await import('../src/app.js');
  ({ database, sequelize } = await import('../database/connection.js'));

  server = app.listen(0, '127.0.0.1');
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
    const contentType = response.headers.get('content-type') || '';
    const responseBody = await response.text();
    const payload = contentType.includes('application/json')
      ? responseBody
        ? JSON.parse(responseBody)
        : null
      : {
          error: {
            code: 'NON_JSON_RESPONSE',
            message: `La ruta respondió ${response.status} sin el contrato JSON esperado`
          }
        };
    return { status: response.status, payload, cookie: response.headers.get('set-cookie') };
  }

  async function login(email, password) {
    const response = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    assert.equal(response.status, 200, JSON.stringify(response.payload));
    return { cookie: response.cookie.split(';')[0], user: response.payload.data.user };
  }

  async function check(id, title, callback) {
    await test(id + ' - ' + title, { concurrency: false }, callback);
  }

  async function pendingCheck(id, title, callback) {
    await test(
      id + ' - ' + title,
      {
        concurrency: false,
        skip: 'Contrato pendiente de implementación en HU-034, HU-035 o HU-036.'
      },
      callback
    );
  }

  function expectStatus(response, status) {
    assert.equal(response.status, status, JSON.stringify(response.payload));
  }

  let admin;
  let operator;
  let building1;
  let building2;
  let newBuilding;
  let newProfile;
  let newUser;
  let unit1;
  let unit2;
  let asset1;
  let asset2;
  let claim1;
  let policy1;

  admin = await login('admin@example.com', 'Admin123!');
  operator = await login('operador@example.com', 'Operador123!');
  const initialBuildings = await request('/api/v1/administration/buildings', {
    cookie: admin.cookie
  });
  expectStatus(initialBuildings, 200);
  building1 = initialBuildings.payload.data.find((item) => item.nit === '900170804-8');
  building2 = initialBuildings.payload.data.find((item) => item.nit === '900020096-7');
  assert.ok(building1 && building2);

  await check('CP-037-01', 'Persistir anticipación y clasificar pólizas por edificio', async () => {
    const path = `/api/v1/insurance/buildings/${building1.id}`;
    const otherPath = `/api/v1/insurance/buildings/${building2.id}`;
    expectStatus(
      await request(path + '/alert-settings', {
        method: 'PUT',
        cookie: admin.cookie,
        body: { alertDays: 0 }
      }),
      200
    );
    assert.equal(
      (await request(path + '/alert-settings', { cookie: admin.cookie })).payload.data.alertDays,
      0
    );
    assert.equal(
      (await request(otherPath + '/alert-settings', { cookie: admin.cookie })).payload.data
        .alertDays,
      30
    );
    const policy = {
      number: 'HU037-001',
      insurer: 'Seguros Prueba',
      coverage: 'Incendio',
      insuredValue: 150000,
      validFrom: '2020-01-01',
      validUntil: '2021-01-01'
    };
    const createdPolicy = await request(path + '/policies', {
      method: 'POST',
      cookie: admin.cookie,
      body: policy
    });
    expectStatus(createdPolicy, 201);
    policy1 = createdPolicy.payload.data;
    expectStatus(
      await request(path + '/policies', { method: 'POST', cookie: admin.cookie, body: policy }),
      409
    );
    const list = await request(path + '/policies', { cookie: admin.cookie });
    expectStatus(list, 200);
    assert.equal(list.payload.data.length, 1);
    assert.equal(list.payload.data[0].expirationStatus, 'Vencida');
    assert.equal(list.payload.data[0].insuredValue, 150000);
    assert.equal(list.payload.data[0].validUntil, policy.validUntil);
    assert.deepEqual(
      (await request(otherPath + '/policies', { cookie: admin.cookie })).payload.data,
      []
    );
  });

  await check('CP-001-01', 'Registrar edificio válido', async () => {
    const response = await request('/api/v1/administration/buildings', {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        name: 'Edificio Pruebas R01',
        nit: '900990101',
        address: 'Calle 50 # 10-20',
        phone: '3000000001',
        email: 'edificio.r01@example.com'
      }
    });
    expectStatus(response, 201);
    newBuilding = response.payload.data;
    const detail = await request(`/api/v1/administration/buildings/${newBuilding.id}`, {
      cookie: admin.cookie
    });
    expectStatus(detail, 200);
    assert.equal(detail.payload.data.nit, '900990101');
  });

  await check('CP-001-02', 'Rechazar campos obligatorios vacíos', async () => {
    for (const field of ['name', 'nit', 'address']) {
      const body = { name: 'Edificio inválido', nit: `INV-${field}`, address: 'Dirección' };
      body[field] = '';
      expectStatus(
        await request('/api/v1/administration/buildings', {
          method: 'POST',
          cookie: admin.cookie,
          body
        }),
        400
      );
    }
  });

  await check('CP-001-03', 'Rechazar NIT duplicado', async () => {
    const response = await request('/api/v1/administration/buildings', {
      method: 'POST',
      cookie: admin.cookie,
      body: { name: 'Duplicado', nit: '900990101', address: 'Otra dirección' }
    });
    expectStatus(response, 409);
  });

  await check('CP-002-01', 'Listar solo edificios asignados', async () => {
    const response = await request('/api/v1/administration/buildings', {
      cookie: operator.cookie
    });
    expectStatus(response, 200);
    assert.deepEqual(
      response.payload.data.map((item) => item.nit),
      [building1.nit]
    );
  });

  await check('CP-002-02', 'Consultar detalle de edificio', async () => {
    const response = await request(`/api/v1/administration/buildings/${building1.id}`, {
      cookie: operator.cookie
    });
    expectStatus(response, 200);
    assert.equal(response.payload.data.nit, building1.nit);
  });

  await check('CP-003-01', 'Actualizar edificio y auditar', async () => {
    const response = await request(`/api/v1/administration/buildings/${newBuilding.id}`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: {
        name: newBuilding.name,
        nit: newBuilding.nit,
        address: 'Carrera 30 # 40-50',
        phone: newBuilding.phone,
        email: newBuilding.email
      }
    });
    expectStatus(response, 200);
    assert.equal(response.payload.data.address, 'Carrera 30 # 40-50');
    const audit = await request(
      `/api/v1/administration/audit-logs?entity=building&buildingId=${newBuilding.id}`,
      { cookie: admin.cookie }
    );
    expectStatus(audit, 200);
    assert.ok(audit.payload.data.some((item) => item.action === 'update'));
  });

  await check('CP-003-02', 'Rechazar actualización sin nombre', async () => {
    const response = await request(`/api/v1/administration/buildings/${newBuilding.id}`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: { name: '', nit: newBuilding.nit, address: 'No debe guardarse' }
    });
    expectStatus(response, 400);
    const detail = await request(`/api/v1/administration/buildings/${newBuilding.id}`, {
      cookie: admin.cookie
    });
    assert.equal(detail.payload.data.address, 'Carrera 30 # 40-50');
  });

  const permissions = await request('/api/v1/administration/permissions', {
    cookie: admin.cookie
  });
  expectStatus(permissions, 200);
  const permissionIds = permissions.payload.data
    .filter((item) => ['buildings.list', 'buildings.read', 'buildings.update'].includes(item.code))
    .map((item) => item.id);

  await check('CP-004-01', 'Crear perfil con permisos', async () => {
    const response = await request('/api/v1/administration/profiles', {
      method: 'POST',
      cookie: admin.cookie,
      body: { name: 'Consulta R01', description: 'Consulta de edificios', permissionIds }
    });
    expectStatus(response, 201);
    newProfile = response.payload.data;
    assert.deepEqual([...newProfile.permissionIds].sort(), [...permissionIds].sort());
  });

  await check('CP-004-02', 'Rechazar perfil sin nombre', async () => {
    expectStatus(
      await request('/api/v1/administration/profiles', {
        method: 'POST',
        cookie: admin.cookie,
        body: { name: '', description: 'Inválido', permissionIds: [] }
      }),
      400
    );
  });

  await check('CP-005-01', 'Registrar usuario válido', async () => {
    const response = await request('/api/v1/administration/users', {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        identification: '109990101',
        name: 'Usuario Pruebas R01',
        email: 'usuario.r01@example.com',
        status: 'active',
        password: 'Usuario123!'
      }
    });
    expectStatus(response, 201);
    newUser = response.payload.data;
    const list = await request('/api/v1/administration/users', { cookie: admin.cookie });
    assert.ok(list.payload.data.some((item) => item.id === newUser.id));
  });

  await check('CP-005-02', 'Rechazar correo duplicado sin distinguir mayúsculas', async () => {
    expectStatus(
      await request('/api/v1/administration/users', {
        method: 'POST',
        cookie: admin.cookie,
        body: {
          identification: '109990102',
          name: 'Usuario Duplicado',
          email: 'USUARIO.R01@EXAMPLE.COM',
          status: 'active'
        }
      }),
      409
    );
  });

  await check('CP-005-03', 'Rechazar usuario con campos vacíos', async () => {
    for (const field of ['identification', 'name', 'email']) {
      const body = {
        identification: `INV-${field}`,
        name: 'Inválido',
        email: `${field}@invalid.test`,
        status: 'active'
      };
      body[field] = '';
      expectStatus(
        await request('/api/v1/administration/users', {
          method: 'POST',
          cookie: admin.cookie,
          body
        }),
        400
      );
    }
  });

  await check('CP-006-01', 'Asignar y conservar perfiles', async () => {
    const assign = await request(`/api/v1/administration/users/${newUser.id}/profiles`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: { profileIds: [newProfile.id, newProfile.id] }
    });
    expectStatus(assign, 200);
    assert.deepEqual(assign.payload.data.profileIds, [newProfile.id]);
    const response = await request(`/api/v1/administration/users/${newUser.id}/profiles`, {
      cookie: admin.cookie
    });
    expectStatus(response, 200);
    assert.deepEqual(response.payload.data.profileIds, [newProfile.id]);
  });

  await check('CP-006-02', 'Denegar operación sin permiso', async () => {
    const response = await request('/api/v1/administration/users', {
      method: 'POST',
      cookie: operator.cookie,
      body: {
        identification: 'NO-PERMITIDO',
        name: 'No permitido',
        email: 'no-permitido@example.com',
        status: 'active'
      }
    });
    expectStatus(response, 403);
  });

  await check('CP-007-01', 'Asignar y consultar edificios', async () => {
    const assign = await request(`/api/v1/administration/users/${newUser.id}/buildings`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: { buildingIds: [building1.id, building2.id] }
    });
    expectStatus(assign, 200);
    const assigned = await request(`/api/v1/administration/users/${newUser.id}/buildings`, {
      cookie: admin.cookie
    });
    assert.deepEqual(
      [...assigned.payload.data.buildingIds].sort(),
      [building1.id, building2.id].sort()
    );
    const userSession = await login('usuario.r01@example.com', 'Usuario123!');
    const list = await request('/api/v1/administration/buildings', { cookie: userSession.cookie });
    expectStatus(list, 200);
    assert.deepEqual(
      list.payload.data.map((item) => item.id).sort(),
      [building1.id, building2.id].sort()
    );
  });

  await check('CP-007-02', 'Denegar edificio no asignado', async () => {
    await request(`/api/v1/administration/users/${newUser.id}/buildings`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: { buildingIds: [building1.id] }
    });
    const userSession = await login('usuario.r01@example.com', 'Usuario123!');
    expectStatus(
      await request(`/api/v1/administration/buildings/${building2.id}`, {
        cookie: userSession.cookie
      }),
      403
    );
    expectStatus(
      await request(`/api/v1/administration/buildings/${building2.id}`, {
        method: 'PUT',
        cookie: userSession.cookie,
        body: building2
      }),
      403
    );
  });

  await check('CP-008-01', 'Iniciar y conservar sesión válida', async () => {
    const session = await login('admin@example.com', 'Admin123!');
    const me = await request('/api/v1/auth/me', { cookie: session.cookie });
    expectStatus(me, 200);
    assert.equal(me.payload.data.user.email, 'admin@example.com');
  });

  await check('CP-008-02', 'Rechazar credenciales incorrectas', async () => {
    expectStatus(
      await request('/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'admin@example.com', password: 'Incorrecta' }
      }),
      401
    );
    expectStatus(
      await request('/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'nadie@example.com', password: 'Incorrecta' }
      }),
      401
    );
  });

  await check('CP-008-03', 'Rechazar usuario inactivo', async () => {
    expectStatus(
      await request('/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'inactivo@example.com', password: 'Inactivo123!' }
      }),
      403
    );
  });

  await check('CP-008-04', 'Cerrar e invalidar sesión', async () => {
    const session = await login('admin@example.com', 'Admin123!');
    expectStatus(
      await request('/api/v1/auth/logout', { method: 'POST', cookie: session.cookie }),
      200
    );
    expectStatus(await request('/api/v1/auth/me', { cookie: session.cookie }), 401);
  });

  await check('CP-009-01', 'Consultar campos de auditoría', async () => {
    const response = await request(
      `/api/v1/administration/audit-logs?entity=building&buildingId=${newBuilding.id}`,
      { cookie: admin.cookie }
    );
    expectStatus(response, 200);
    const entry = response.payload.data.find((item) => item.action === 'update');
    assert.ok(entry.userId && entry.createdAt && entry.entityId && entry.buildingId);
  });

  await check('CP-009-02', 'Filtrar auditoría', async () => {
    const response = await request(
      `/api/v1/administration/audit-logs?entity=building&buildingId=${newBuilding.id}&module=administration`,
      { cookie: admin.cookie }
    );
    expectStatus(response, 200);
    assert.ok(response.payload.data.length >= 2);
    assert.ok(
      response.payload.data.every(
        (item) =>
          item.entity === 'building' &&
          item.buildingId === newBuilding.id &&
          item.module === 'administration'
      )
    );
  });

  const unitBody = {
    number: '901',
    tower: 'PR-R01',
    kind: 'apartamento',
    coefficient: 1.5,
    status: 'desocupada'
  };
  await check('CP-010-01', 'Registrar inmueble válido', async () => {
    const response = await request(`/api/v1/administration/buildings/${building1.id}/units`, {
      method: 'POST',
      cookie: admin.cookie,
      body: unitBody
    });
    expectStatus(response, 201);
    unit1 = response.payload.data;
    const second = await request(`/api/v1/administration/buildings/${building1.id}/units`, {
      method: 'POST',
      cookie: admin.cookie,
      body: { ...unitBody, number: '902' }
    });
    expectStatus(second, 201);
    unit2 = second.payload.data;
    assert.equal(unit1.buildingId, building1.id);
  });

  await check('CP-010-02', 'Rechazar inmueble duplicado', async () => {
    expectStatus(
      await request(`/api/v1/administration/buildings/${building1.id}/units`, {
        method: 'POST',
        cookie: admin.cookie,
        body: unitBody
      }),
      409
    );
  });

  await check('CP-010-03', 'Validar rango del coeficiente', async () => {
    for (const coefficient of [-0.01, 100.01]) {
      expectStatus(
        await request(`/api/v1/administration/buildings/${building1.id}/units`, {
          method: 'POST',
          cookie: admin.cookie,
          body: { ...unitBody, number: `INV-${coefficient}`, coefficient }
        }),
        400
      );
    }
    for (const coefficient of [0, 100]) {
      expectStatus(
        await request(`/api/v1/administration/buildings/${building1.id}/units`, {
          method: 'POST',
          cookie: admin.cookie,
          body: { ...unitBody, number: `LIM-${coefficient}`, coefficient }
        }),
        201
      );
    }
  });

  await check('CP-011-01', 'Registrar responsable sin credenciales', async () => {
    const response = await request('/api/v1/administration/persons', {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        identification: '209990101',
        name: 'Responsable R01',
        phone: '3000000002',
        email: 'responsable.r01@example.com',
        unitIds: [unit1.id, unit2.id]
      }
    });
    expectStatus(response, 201);
    assert.equal(response.payload.data.units.length, 2);
    const users = await request('/api/v1/administration/users', { cookie: admin.cookie });
    assert.ok(!users.payload.data.some((item) => item.email === 'responsable.r01@example.com'));
  });

  await check('CP-011-02', 'Rechazar responsable incompleto', async () => {
    const variants = [
      { identification: 'P-SIN-UNIDAD', name: 'Sin unidad', unitIds: [] },
      { identification: '', name: 'Sin identificación', unitIds: [unit1.id] },
      { identification: 'P-SIN-NOMBRE', name: '', unitIds: [unit1.id] }
    ];
    for (const body of variants) {
      expectStatus(
        await request('/api/v1/administration/persons', {
          method: 'POST',
          cookie: admin.cookie,
          body
        }),
        400
      );
    }
  });

  const assetBody = {
    code: 'ACT-R01-01',
    name: 'Bomba R01',
    description: 'Equipo de prueba',
    type: 'hidraulico',
    status: 'activo',
    location: 'Cuarto técnico',
    acquisitionDate: '2026-09-01'
  };
  await check('CP-012-01', 'Registrar activo asociado', async () => {
    const response = await request(`/api/v1/assets/buildings/${building1.id}/assets`, {
      method: 'POST',
      cookie: admin.cookie,
      body: assetBody
    });
    expectStatus(response, 201);
    asset1 = response.payload.data;
    const response2 = await request(`/api/v1/assets/buildings/${building2.id}/assets`, {
      method: 'POST',
      cookie: admin.cookie,
      body: { ...assetBody, code: 'ACT-R01-02', name: 'Equipo R01' }
    });
    expectStatus(response2, 201);
    asset2 = response2.payload.data;
    assert.equal(asset1.buildingId, building1.id);
  });

  await check('CP-038-01', 'Registrar reclamación con póliza, activos y documentos', async () => {
    const policies = await request(`/api/v1/insurance/buildings/${building1.id}/policies`, {
      cookie: admin.cookie
    });
    const policy = policies.payload.data.find((item) => item.number === 'HU037-001');
    assert.ok(policy);
    const claimBody = {
      policyId: policy.id,
      claimDate: '2020-01-01',
      description: 'Daño eléctrico de prueba',
      status: 'indemnizada',
      result: 'Indemnización aprobada',
      claimedAmount: 250000,
      indemnityAmount: 200000,
      resolvedAt: '2020-02-01',
      documentRefs: ['acta-prueba.pdf'],
      assetIds: [asset1.id]
    };
    expectStatus(
      await request(`/api/v1/insurance/buildings/${building1.id}/claims`, {
        method: 'POST',
        cookie: admin.cookie,
        body: { ...claimBody, assetIds: [asset2.id] }
      }),
      400
    );
    const created = await request(`/api/v1/insurance/buildings/${building1.id}/claims`, {
      method: 'POST',
      cookie: admin.cookie,
      body: claimBody
    });
    expectStatus(created, 201);
    claim1 = created.payload.data;
    const claims = await request(`/api/v1/insurance/buildings/${building1.id}/claims`, {
      cookie: admin.cookie
    });
    expectStatus(claims, 200);
    assert.equal(claims.payload.data[0].policyNumber, 'HU037-001');
    assert.equal(claims.payload.data[0].assets[0].id, asset1.id);
    assert.deepEqual(claims.payload.data[0].documentRefs, ['acta-prueba.pdf']);
    const formData = new FormData();
    const pdf = '%PDF-1.4\n% persistence test\n%%EOF';
    formData.append('payload', JSON.stringify(claimBody));
    formData.append('documents', new Blob([pdf], { type: 'application/pdf' }), 'acta.pdf');
    const uploaded = await fetch(`${baseUrl}/api/v1/insurance/buildings/${building1.id}/claims`, {
      method: 'POST',
      body: formData,
      headers: { Cookie: admin.cookie, 'X-Requested-With': 'XMLHttpRequest' }
    });
    const payload = await uploaded.json();
    uploadedDocuments.push(...(payload.data?.documents ?? []));
    assert.equal(uploaded.status, 201, JSON.stringify(payload));
    assert.equal(payload.data.documents.length, 1);
    const claimId = payload.data.id;
    const documentId = payload.data.documents[0].id;
    const downloadPath = `/api/v1/insurance/buildings/${building1.id}/claims/${claimId}/documents/${documentId}`;
    const download = await fetch(baseUrl + downloadPath, { headers: { Cookie: admin.cookie } });
    assert.equal(download.status, 200);
    assert.equal(await download.text(), pdf);
    const wrongBuilding = await fetch(
      baseUrl + downloadPath.replace(`/buildings/${building1.id}/`, `/buildings/${building2.id}/`),
      { headers: { Cookie: admin.cookie } }
    );
    assert.equal(wrongBuilding.status, 404);
  });

  await check('CP-039-01', 'Consultar historial por edificio, póliza o activo', async () => {
    const path = `/api/v1/insurance/buildings/${building1.id}/claims`;
    const filtered = await request(`${path}?policyId=${claim1.policyId}&assetId=${asset1.id}`, {
      cookie: admin.cookie
    });
    expectStatus(filtered, 200);
    assert.ok(filtered.payload.data.some((claim) => claim.id === claim1.id));
    const claim = filtered.payload.data.find((item) => item.id === claim1.id);
    assert.equal(claim.result, 'Indemnización aprobada');
    assert.equal(claim.indemnityAmount, 200000);
    assert.equal(claim.resolvedAt, '2020-02-01');
    assert.ok(claim.documentRefs.includes('acta-prueba.pdf'));

    const otherAsset = await request(`${path}?assetId=${asset2.id}`, { cookie: admin.cookie });
    expectStatus(otherAsset, 200);
    assert.equal(otherAsset.payload.data.length, 0);
    expectStatus(await request(path, { cookie: operator.cookie }), 403);
  });

  await check('CP-012-02', 'Rechazar activo sin datos obligatorios', async () => {
    expectStatus(
      await request('/api/v1/assets/buildings/999999/assets', {
        method: 'POST',
        cookie: admin.cookie,
        body: assetBody
      }),
      404
    );
    for (const field of ['code', 'name']) {
      expectStatus(
        await request(`/api/v1/assets/buildings/${building1.id}/assets`, {
          method: 'POST',
          cookie: admin.cookie,
          body: { ...assetBody, code: `INV-${field}`, [field]: '' }
        }),
        400
      );
    }
  });

  await check('CP-013-01', 'Listar activos por edificio', async () => {
    const first = await request(`/api/v1/assets/buildings/${building1.id}/assets`, {
      cookie: admin.cookie
    });
    const second = await request(`/api/v1/assets/buildings/${building2.id}/assets`, {
      cookie: admin.cookie
    });
    expectStatus(first, 200);
    expectStatus(second, 200);
    assert.ok(first.payload.data.some((item) => item.id === asset1.id));
    assert.ok(!first.payload.data.some((item) => item.id === asset2.id));
    assert.ok(second.payload.data.some((item) => item.id === asset2.id));
    for (const field of ['code', 'name', 'type', 'status', 'location']) {
      assert.ok(
        Object.hasOwn(
          first.payload.data.find((item) => item.id === asset1.id),
          field
        )
      );
    }
  });

  await check('CP-013-02', 'Mostrar edificio sin activos', async () => {
    const response = await request(`/api/v1/assets/buildings/${newBuilding.id}/assets`, {
      cookie: admin.cookie
    });
    expectStatus(response, 200);
    assert.deepEqual(response.payload.data, []);
  });

  await check('CP-014-01', 'Actualizar activo y registrar historial', async () => {
    const response = await request(`/api/v1/assets/${asset1.id}`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: {
        name: 'Bomba actualizada R01',
        description: asset1.description,
        type: asset1.type,
        location: 'Sótano',
        acquisitionDate: asset1.acquisitionDate
      }
    });
    expectStatus(response, 200);
    assert.equal(response.payload.data.location, 'Sótano');
    const history = await request(`/api/v1/assets/${asset1.id}/history`, {
      cookie: admin.cookie
    });
    assert.ok(history.payload.data.some((item) => item.field === 'location'));
    assert.ok(history.payload.data.some((item) => item.createdBy === admin.user.id));
  });

  await check('CP-014-02', 'Rechazar actualización de activo sin nombre', async () => {
    const response = await request(`/api/v1/assets/${asset1.id}`, {
      method: 'PUT',
      cookie: admin.cookie,
      body: {
        name: '',
        description: asset1.description,
        type: asset1.type,
        location: 'No debe guardarse',
        acquisitionDate: asset1.acquisitionDate
      }
    });
    expectStatus(response, 400);
    const detail = await request(`/api/v1/assets/${asset1.id}`, { cookie: admin.cookie });
    assert.equal(detail.payload.data.location, 'Sótano');
  });

  await check('CP-015-01', 'Cambiar estado con motivo', async () => {
    const response = await request(`/api/v1/assets/${asset1.id}/status`, {
      method: 'PATCH',
      cookie: admin.cookie,
      body: { status: 'en_mantenimiento', reason: 'Revisión R01' }
    });
    expectStatus(response, 200);
    assert.equal(response.payload.data.status, 'en_mantenimiento');
    const history = await request(`/api/v1/assets/${asset1.id}/history`, {
      cookie: admin.cookie
    });
    const entry = history.payload.data.find((item) => item.reason === 'Revisión R01');
    assert.ok(entry?.createdAt && entry.createdBy === admin.user.id);
  });

  await check('CP-015-02', 'Rechazar cambio de estado sin motivo', async () => {
    expectStatus(
      await request(`/api/v1/assets/${asset1.id}/status`, {
        method: 'PATCH',
        cookie: admin.cookie,
        body: { status: 'retirado', reason: '' }
      }),
      400
    );
    const detail = await request(`/api/v1/assets/${asset1.id}`, { cookie: admin.cookie });
    assert.equal(detail.payload.data.status, 'en_mantenimiento');
  });

  await check('CP-016-01', 'Consultar historial cronológico', async () => {
    const response = await request(`/api/v1/assets/${asset1.id}/history`, {
      cookie: admin.cookie
    });
    expectStatus(response, 200);
    assert.ok(response.payload.data.length >= 4);
    for (let index = 1; index < response.payload.data.length; index += 1) {
      const previous = response.payload.data[index - 1];
      const current = response.payload.data[index];
      assert.ok(
        new Date(previous.createdAt) < new Date(current.createdAt) ||
          (new Date(previous.createdAt).getTime() === new Date(current.createdAt).getTime() &&
            previous.id < current.id)
      );
      assert.ok(current.createdBy);
    }
  });

  await check('CP-005-04', 'Rechazar correo con formato inválido', async () => {
    const response = await request('/api/v1/administration/users', {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        identification: 'EMAIL-INVALIDO',
        name: 'Usuario de prueba',
        email: 'correo-sin-formato',
        status: 'active'
      }
    });
    expectStatus(response, 400);
  });

  await check('CP-012-03', 'Rechazar fecha de adquisición imposible', async () => {
    const response = await request(`/api/v1/assets/buildings/${building1.id}/assets`, {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        code: 'ACT-FECHA-INVALIDA',
        name: 'Activo de prueba',
        description: 'Validación de calendario',
        type: 'otro',
        status: 'activo',
        location: 'Pruebas',
        acquisitionDate: '2026-02-31'
      }
    });
    expectStatus(response, 400);
  });

  await check('CP-028-02', 'HU-028: impedir consultar historial de otro edificio', async () => {
    const response = await request(`/api/v1/maintenance/assets/${asset2.id}/maintenances`, {
      cookie: operator.cookie
    });
    expectStatus(response, 403);
  });

  let portfolioInvoiceId;
  await check(
    'CP-046-01',
    'HU-046: mostrar capital, intereses, pagos y saldo por apartamento',
    async () => {
      const [invoiceResult] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2025-01', '2025-01-10', 'pendiente', 'HU046-001', 500000, ?, ?)`,
        [building1.id, unit1.id, admin.user.id, admin.user.id]
      );
      portfolioInvoiceId = invoiceResult.insertId;
      const [paymentResult] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2025-01-15', 300000, 'transferencia', 'HU046-PAGO-001', 'aplicado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 300000)',
        [paymentResult.insertId, portfolioInvoiceId]
      );
      await database.query(
        `INSERT INTO late_interests (invoice_id, calculation_date, amount, status, created_by)
         VALUES (?, '2025-02-01', 15000, 'pendiente', ?)`,
        [portfolioInvoiceId, admin.user.id]
      );

      const [reversedPayment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2025-01-20', 10000, 'efectivo', 'HU046-REV-001', 'reversado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 10000)',
        [reversedPayment.insertId, portfolioInvoiceId]
      );
      await database.query(
        `INSERT INTO late_interests (invoice_id, calculation_date, amount, status, created_by)
         VALUES (?, '2025-02-02', 5000, 'reversado', ?)`,
        [portfolioInvoiceId, admin.user.id]
      );

      const response = await request(
        `/api/v1/billing/buildings/${building1.id}/portfolio?unitId=${unit1.id}`,
        { cookie: admin.cookie }
      );
      expectStatus(response, 200);
      assert.deepEqual(response.payload.data, [
        {
          unitId: unit1.id,
          unitNumber: unit1.number,
          tower: unit1.tower,
          capital: 500000,
          otherConcepts: 0,
          interests: 15000,
          payments: 300000,
          totalBalance: 215000,
          status: 'en_mora'
        }
      ]);
    }
  );

  await check(
    'CP-046-02',
    'HU-046: filtrar cartera y aislar la información entre edificios',
    async () => {
      const otherUnitResponse = await request(
        `/api/v1/administration/buildings/${building2.id}/units`,
        {
          method: 'POST',
          cookie: admin.cookie,
          body: {
            number: 'HU046-OTRO',
            tower: 'PR',
            kind: 'apartamento',
            coefficient: 1,
            status: 'desocupada'
          }
        }
      );
      expectStatus(otherUnitResponse, 201);
      const otherUnit = otherUnitResponse.payload.data;

      const filtered = await request(
        `/api/v1/billing/buildings/${building1.id}/portfolio?unitId=${unit1.id}&period=2025-01&status=en_mora`,
        { cookie: admin.cookie }
      );
      expectStatus(filtered, 200);
      assert.deepEqual(
        filtered.payload.data.map((row) => row.unitId),
        [unit1.id]
      );

      const crossBuilding = await request(
        `/api/v1/billing/buildings/${building1.id}/portfolio?unitId=${otherUnit.id}`,
        { cookie: admin.cookie }
      );
      expectStatus(crossBuilding, 200);
      assert.deepEqual(crossBuilding.payload.data, []);

      const current = await request(
        `/api/v1/billing/buildings/${building1.id}/portfolio?period=2025-01&status=al_dia`,
        { cookie: admin.cookie }
      );
      expectStatus(current, 200);
      assert.ok(current.payload.data.some((row) => row.unitId === unit2.id));

      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/portfolio?period=enero`, {
          cookie: admin.cookie
        }),
        400
      );
      const buildingAdmin = await login('edificio@example.com', 'Edificio123!');
      expectStatus(
        await request(`/api/v1/billing/buildings/${building2.id}/portfolio`, {
          cookie: buildingAdmin.cookie
        }),
        403
      );
    }
  );

  let historyInvoiceId;
  let invoiceWithoutPaymentsId;
  await check(
    'CP-047-01',
    'HU-047: listar facturas por apartamento, periodo y estado',
    async () => {
      const [partialInvoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2025-02', '2025-02-15', 'parcialmente_pagada', 'HU047-001', 600000, ?, ?)`,
        [building1.id, unit1.id, admin.user.id, admin.user.id]
      );
      historyInvoiceId = partialInvoice.insertId;
      await database.query(
        `INSERT INTO invoice_items (invoice_id, concept, amount)
         VALUES (?, 'Administración', 500000), (?, 'Cuota extraordinaria', 100000)`,
        [historyInvoiceId, historyInvoiceId]
      );

      const [paidInvoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2025-03', '2025-03-15', 'pagada', 'HU047-002', 450000, ?, ?)`,
        [building1.id, unit1.id, admin.user.id, admin.user.id]
      );
      await database.query(
        `INSERT INTO invoice_items (invoice_id, concept, amount)
         VALUES (?, 'Administración', 450000)`,
        [paidInvoice.insertId]
      );

      const [otherUnitInvoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2025-04', '2025-04-15', 'pendiente', 'HU047-OTRA', 300000, ?, ?)`,
        [building1.id, unit2.id, admin.user.id, admin.user.id]
      );
      invoiceWithoutPaymentsId = otherUnitInvoice.insertId;
      await database.query(
        `INSERT INTO invoice_items (invoice_id, concept, amount)
         VALUES (?, 'Administración', 300000)`,
        [invoiceWithoutPaymentsId]
      );

      const history = await request(
        `/api/v1/billing/buildings/${building1.id}/invoices?unitId=${unit1.id}`,
        { cookie: admin.cookie }
      );
      expectStatus(history, 200);
      assert.deepEqual(
        history.payload.data.slice(0, 3).map((invoice) => invoice.period),
        ['2025-03', '2025-02', '2025-01']
      );
      assert.ok(history.payload.data.every((invoice) => invoice.unitId === unit1.id));

      const filtered = await request(
        `/api/v1/billing/buildings/${building1.id}/invoices?unitId=${unit1.id}&period=2025-02&status=parcialmente_pagada`,
        { cookie: admin.cookie }
      );
      expectStatus(filtered, 200);
      assert.deepEqual(
        filtered.payload.data.map((invoice) => invoice.id),
        [historyInvoiceId]
      );

      const crossBuildingUnit = await request(
        `/api/v1/billing/buildings/${building2.id}/invoices?unitId=${unit1.id}`,
        { cookie: admin.cookie }
      );
      expectStatus(crossBuildingUnit, 200);
      assert.deepEqual(crossBuildingUnit.payload.data, []);

      expectStatus(
        await request(
          `/api/v1/billing/buildings/${building1.id}/invoices?unitId=${unit1.id}&period=febrero`,
          { cookie: admin.cookie }
        ),
        400
      );
      expectStatus(
        await request(
          `/api/v1/billing/buildings/${building1.id}/invoices?unitId=${unit1.id}&status=anulada`,
          { cookie: admin.cookie }
        ),
        400
      );
      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/invoices`, {
          cookie: admin.cookie
        }),
        400
      );
      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/invoices?unitId=${unit1.id}`, {
          cookie: operator.cookie
        }),
        403
      );
      const buildingAdmin = await login('edificio@example.com', 'Edificio123!');
      expectStatus(
        await request(`/api/v1/billing/buildings/${building2.id}/invoices?unitId=${unit1.id}`, {
          cookie: buildingAdmin.cookie
        }),
        403
      );
    }
  );

  await check(
    'CP-047-02',
    'HU-047: abrir detalle con conceptos, pagos y saldo de forma segura',
    async () => {
      const [payment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2025-02-20', 200000, 'transferencia', 'HU047-PAGO-001', 'aplicado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 200000)',
        [payment.insertId, historyInvoiceId]
      );
      const [reversedPayment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2025-02-21', 50000, 'efectivo', 'HU047-PAGO-REV', 'reversado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 50000)',
        [reversedPayment.insertId, historyInvoiceId]
      );
      await database.query(
        `INSERT INTO late_interests (invoice_id, calculation_date, amount, status, created_by)
         VALUES (?, '2025-03-01', 15000, 'pendiente', ?),
                (?, '2025-03-02', 5000, 'reversado', ?)`,
        [historyInvoiceId, admin.user.id, historyInvoiceId, admin.user.id]
      );

      const detail = await request(
        `/api/v1/billing/buildings/${building1.id}/invoices/${historyInvoiceId}`,
        { cookie: admin.cookie }
      );
      expectStatus(detail, 200);
      assert.equal(detail.payload.data.total, 600000);
      assert.equal(detail.payload.data.interests, 15000);
      assert.equal(detail.payload.data.appliedPayments, 200000);
      assert.equal(detail.payload.data.balance, 415000);
      assert.deepEqual(
        detail.payload.data.items.map((item) => item.concept),
        ['Administración', 'Cuota extraordinaria']
      );
      assert.deepEqual(detail.payload.data.payments.map((item) => item.status).sort(), [
        'aplicado',
        'reversado'
      ]);

      const withoutPayments = await request(
        `/api/v1/billing/buildings/${building1.id}/invoices/${invoiceWithoutPaymentsId}`,
        { cookie: admin.cookie }
      );
      expectStatus(withoutPayments, 200);
      assert.equal(withoutPayments.payload.data.appliedPayments, 0);
      assert.equal(withoutPayments.payload.data.balance, 300000);

      expectStatus(
        await request(`/api/v1/billing/buildings/${building2.id}/invoices/${historyInvoiceId}`, {
          cookie: admin.cookie
        }),
        404
      );
      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/invoices/99999999`, {
          cookie: admin.cookie
        }),
        404
      );
    }
  );

  let interestInvoiceId;
  await check(
    'CP-049-01',
    'HU-049: configurar tasa y calcular días e interés de mora',
    async () => {
      const [invoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2024-08', '2024-08-10', 'pendiente', 'HU049-001', 365000, ?, ?)`,
        [building1.id, unit2.id, admin.user.id, admin.user.id]
      );
      interestInvoiceId = invoice.insertId;

      const response = await request(
        `/api/v1/billing/buildings/${building1.id}/interest-settings`,
        {
          method: 'PUT',
          cookie: admin.cookie,
          body: { annualRate: 36.5 }
        }
      );
      expectStatus(response, 200);
      assert.equal(response.payload.data.settings.annualRate, 36.5);
      const calculation = response.payload.data.calculation.invoices.find(
        (item) => item.invoiceId === interestInvoiceId
      );
      assert.ok(calculation.overdueDays > 0);
      assert.ok(calculation.amount > 0);

      const settings = await request(
        `/api/v1/billing/buildings/${building1.id}/interest-settings`,
        { cookie: admin.cookie }
      );
      expectStatus(settings, 200);
      assert.equal(settings.payload.data.annualRate, 36.5);

      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/interest-settings`, {
          method: 'PUT',
          cookie: admin.cookie,
          body: { annualRate: -1 }
        }),
        400
      );
      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/interest-settings`, {
          method: 'PUT',
          cookie: admin.cookie,
          body: { annualRate: 100.01 }
        }),
        400
      );
      expectStatus(
        await request(`/api/v1/billing/buildings/${building1.id}/interests/recalculate`, {
          method: 'POST',
          cookie: operator.cookie
        }),
        403
      );
    }
  );

  await check(
    'CP-049-02',
    'HU-049: recalcular cuando cambia el saldo o la fecha del pago',
    async () => {
      const [invoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2024-09', '2024-09-10', 'parcialmente_pagada', 'HU049-002', 365000, ?, ?)`,
        [building1.id, unit1.id, admin.user.id, admin.user.id]
      );
      const [payment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2024-09-15', 165000, 'transferencia', 'HU049-PAGO-001', 'aplicado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 165000)',
        [payment.insertId, invoice.insertId]
      );
      const [reversedPayment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2024-09-12', 50000, 'efectivo', 'HU049-PAGO-REV', 'reversado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 50000)',
        [reversedPayment.insertId, invoice.insertId]
      );

      const first = await request(
        `/api/v1/billing/buildings/${building1.id}/interests/recalculate`,
        { method: 'POST', cookie: admin.cookie }
      );
      expectStatus(first, 200);
      const firstCalculation = first.payload.data.invoices.find(
        (item) => item.invoiceId === invoice.insertId
      );
      assert.equal(firstCalculation.capitalBalance, 200000);

      await database.query(
        `UPDATE payments SET payment_date = '2024-09-20', amount = 265000 WHERE id = ?`,
        [payment.insertId]
      );
      await database.query('UPDATE payment_allocations SET amount = 265000 WHERE payment_id = ?', [
        payment.insertId
      ]);

      const second = await request(
        `/api/v1/billing/buildings/${building1.id}/interests/recalculate`,
        { method: 'POST', cookie: admin.cookie }
      );
      expectStatus(second, 200);
      const secondCalculation = second.payload.data.invoices.find(
        (item) => item.invoiceId === invoice.insertId
      );
      assert.equal(secondCalculation.capitalBalance, 100000);
      assert.notEqual(secondCalculation.amount, firstCalculation.amount);

      const [activeInterests] = await database.query(
        `SELECT amount FROM late_interests
         WHERE invoice_id = ? AND status <> 'reversado'`,
        [invoice.insertId]
      );
      assert.equal(activeInterests.length, 1);
      assert.equal(Number(activeInterests[0].amount), secondCalculation.amount);
    }
  );

  await check(
    'CP-050-01',
    'HU-050: separar capital, intereses y otros conceptos en la cartera',
    async () => {
      const [invoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2024-10', '2024-10-10', 'parcialmente_pagada', 'HU050-001', 600000, ?, ?)`,
        [building1.id, unit2.id, admin.user.id, admin.user.id]
      );
      await database.query(
        `INSERT INTO invoice_items (invoice_id, concept, item_type, amount)
         VALUES (?, 'Administración', 'capital', 500000),
                (?, 'Uso de salón', 'other', 100000)`,
        [invoice.insertId, invoice.insertId]
      );
      await database.query(
        `INSERT INTO late_interests (invoice_id, calculation_date, amount, status, created_by)
         VALUES (?, '2024-11-01', 15000, 'pendiente', ?)`,
        [invoice.insertId, admin.user.id]
      );
      const [payment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2024-10-15', 200000, 'transferencia', 'HU050-PAGO-001', 'aplicado', ?)`,
        [building1.id, unit2.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 200000)',
        [payment.insertId, invoice.insertId]
      );

      const portfolio = await request(
        `/api/v1/billing/buildings/${building1.id}/portfolio?unitId=${unit2.id}&period=2024-10`,
        { cookie: admin.cookie }
      );
      expectStatus(portfolio, 200);
      assert.deepEqual(portfolio.payload.data, [
        {
          unitId: unit2.id,
          unitNumber: unit2.number,
          tower: unit2.tower,
          capital: 500000,
          otherConcepts: 100000,
          interests: 15000,
          payments: 200000,
          totalBalance: 415000,
          status: 'en_mora'
        }
      ]);

      const detail = await request(
        `/api/v1/billing/buildings/${building1.id}/invoices/${invoice.insertId}`,
        { cookie: admin.cookie }
      );
      expectStatus(detail, 200);
      assert.deepEqual(
        detail.payload.data.items.map((item) => item.itemType),
        ['capital', 'other']
      );
    }
  );

  await check(
    'CP-050-02',
    'HU-050: excluir intereses y otros conceptos de la base del nuevo cálculo',
    async () => {
      const [invoice] = await database.query(
        `INSERT INTO invoices
          (building_id, unit_id, period, due_date, status, payment_reference, total, created_by, updated_by)
         VALUES (?, ?, '2024-11', '2024-11-10', 'parcialmente_pagada', 'HU050-002', 600000, ?, ?)`,
        [building1.id, unit1.id, admin.user.id, admin.user.id]
      );
      await database.query(
        `INSERT INTO invoice_items (invoice_id, concept, item_type, amount)
         VALUES (?, 'Administración', 'capital', 500000),
                (?, 'Multa', 'other', 100000)`,
        [invoice.insertId, invoice.insertId]
      );
      await database.query(
        `INSERT INTO late_interests (invoice_id, calculation_date, amount, status, created_by)
         VALUES (?, '2024-11-11', 999999, 'pendiente', ?)`,
        [invoice.insertId, admin.user.id]
      );
      const [payment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2024-11-15', 600000, 'transferencia', 'HU050-PAGO-002', 'aplicado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 600000)',
        [payment.insertId, invoice.insertId]
      );
      const [reversedPayment] = await database.query(
        `INSERT INTO payments
          (building_id, unit_id, payment_date, amount, payment_method, reference, status, created_by)
         VALUES (?, ?, '2024-11-11', 500000, 'efectivo', 'HU050-PAGO-REV', 'reversado', ?)`,
        [building1.id, unit1.id, admin.user.id]
      );
      await database.query(
        'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, 500000)',
        [reversedPayment.insertId, invoice.insertId]
      );

      const response = await request(
        `/api/v1/billing/buildings/${building1.id}/interests/recalculate`,
        { method: 'POST', cookie: admin.cookie }
      );
      expectStatus(response, 200);
      const calculation = response.payload.data.invoices.find(
        (item) => item.invoiceId === invoice.insertId
      );
      assert.equal(calculation.capitalBalance, 0);
      assert.equal(calculation.amount, 2500);

      const [activeInterests] = await database.query(
        `SELECT amount FROM late_interests
         WHERE invoice_id = ? AND status <> 'reversado'`,
        [invoice.insertId]
      );
      assert.deepEqual(
        activeInterests.map((item) => Number(item.amount)),
        [2500]
      );
    }
  );

  await pendingCheck(
    'CP-034-01',
    'HU-034: asociar varios activos y mostrarlos en el detalle',
    async () => {
      const association = await request(
        `/api/v1/insurance/buildings/${building1.id}/policies/${policy1.id}/assets`,
        {
          method: 'PUT',
          cookie: admin.cookie,
          body: { assetIds: [asset1.id] }
        }
      );
      expectStatus(association, 200);
      assert.deepEqual(association.payload.data.assetIds, [asset1.id]);

      const detail = await request(`/api/v1/assets/${asset1.id}`, { cookie: admin.cookie });
      expectStatus(detail, 200);
      assert.ok(detail.payload.data.policies.some((policy) => policy.id === policy1.id));
    }
  );

  await pendingCheck(
    'CP-034-02',
    'HU-034: rechazar activos de otro edificio sin cambios parciales',
    async () => {
      const response = await request(
        `/api/v1/insurance/buildings/${building1.id}/policies/${policy1.id}/assets`,
        {
          method: 'PUT',
          cookie: admin.cookie,
          body: { assetIds: [asset1.id, asset2.id] }
        }
      );
      expectStatus(response, 400);

      const detail = await request(`/api/v1/assets/${asset2.id}`, { cookie: admin.cookie });
      expectStatus(detail, 200);
      assert.ok(!(detail.payload.data.policies ?? []).some((policy) => policy.id === policy1.id));
    }
  );

  await pendingCheck(
    'CP-036-01',
    'HU-036: filtrar pólizas por aseguradora, estado y vencimiento',
    async () => {
      const path = `/api/v1/insurance/buildings/${building1.id}/policies`;
      expectStatus(
        await request(path, {
          method: 'POST',
          cookie: admin.cookie,
          body: {
            number: 'HU036-002',
            insurer: 'Otra Aseguradora',
            coverage: 'Responsabilidad civil',
            insuredValue: 200000,
            validFrom: '2098-01-01',
            validUntil: '2099-01-01'
          }
        }),
        201
      );
      const filtered = await request(
        `${path}?insurer=Seguros%20Prueba&status=vencida&expiresTo=2021-12-31`,
        { cookie: admin.cookie }
      );
      expectStatus(filtered, 200);
      assert.deepEqual(
        filtered.payload.data.map((policy) => policy.id),
        [policy1.id]
      );
    }
  );

  await pendingCheck(
    'CP-036-02',
    'HU-036: rechazar filtros inválidos y otro edificio',
    async () => {
      const path = `/api/v1/insurance/buildings/${building1.id}/policies`;
      expectStatus(await request(`${path}?expiresFrom=no-es-fecha`, { cookie: admin.cookie }), 400);
      expectStatus(
        await request(`/api/v1/insurance/buildings/${building2.id}/policies`, {
          cookie: operator.cookie
        }),
        403
      );
    }
  );

  await pendingCheck('CP-035-01', 'HU-035: actualizar póliza y registrar auditoría', async () => {
    const response = await request(
      `/api/v1/insurance/buildings/${building1.id}/policies/${policy1.id}`,
      {
        method: 'PUT',
        cookie: admin.cookie,
        body: {
          number: policy1.number,
          insurer: 'Seguros Prueba Actualizada',
          coverage: 'Incendio, terremoto y responsabilidad civil',
          insuredValue: 175000,
          validFrom: '2020-01-01',
          validUntil: '2022-01-01'
        }
      }
    );
    expectStatus(response, 200);
    assert.equal(response.payload.data.insurer, 'Seguros Prueba Actualizada');

    const audit = await request(
      `/api/v1/administration/audit-logs?entity=insurance_policy&entityId=${policy1.id}`,
      { cookie: admin.cookie }
    );
    expectStatus(audit, 200);
    assert.ok(audit.payload.data.some((entry) => entry.action === 'update'));
  });

  await pendingCheck(
    'CP-035-02',
    'HU-035: rechazar fechas inválidas y falta de acceso',
    async () => {
      const path = `/api/v1/insurance/buildings/${building1.id}/policies/${policy1.id}`;
      const invalid = await request(path, {
        method: 'PUT',
        cookie: admin.cookie,
        body: {
          number: policy1.number,
          insurer: policy1.insurer,
          coverage: policy1.coverage,
          insuredValue: policy1.insuredValue,
          validFrom: '2027-01-01',
          validUntil: '2026-01-01'
        }
      });
      expectStatus(invalid, 400);
      expectStatus(
        await request(path, {
          method: 'PUT',
          cookie: operator.cookie,
          body: policy1
        }),
        403
      );
    }
  );
});
