import assert from 'node:assert/strict';

const { app } = await import('../src/app.js');
const { database, sequelize } = await import('../database/connection.js');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const results = [];

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
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
  try {
    await callback();
    results.push({ id, title, status: 'APROBADO', detail: 'Resultado esperado obtenido.' });
  } catch (error) {
    results.push({ id, title, status: 'FALLIDO', detail: error.message });
  }
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

try {
  admin = await login('admin@example.com', 'Admin123!');
  operator = await login('operador@example.com', 'Operador123!');
  const initialBuildings = await request('/api/v1/administration/buildings', {
    cookie: admin.cookie
  });
  expectStatus(initialBuildings, 200);
  building1 = initialBuildings.payload.data.find((item) => item.nit === '900111001');
  building2 = initialBuildings.payload.data.find((item) => item.nit === '900111003');
  assert.ok(building1 && building2);

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
      ['900111001']
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
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.end();
  await sequelize.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status === 'FALLIDO')) process.exitCode = 1;
