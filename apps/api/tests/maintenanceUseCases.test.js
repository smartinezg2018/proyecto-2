import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceUseCases } from '../src/modules/maintenance/application/maintenanceUseCases.js';

function createRepositories() {
  const assets = [
    { id: 1, buildingId: 10, code: 'ACT-001', name: 'Ascensor Torre A', status: 'activo' },
    { id: 2, buildingId: 10, code: 'ACT-002', name: 'Bomba', status: 'retirado' },
    { id: 3, buildingId: 20, code: 'ACT-003', name: 'Planta', status: 'activo' }
  ];
  const maintenances = [];
  const history = [];
  const auditEntries = [];

  return {
    history,
    maintenances,
    auditEntries,
    assetRepository: {
      async findById(id) {
        return assets.find((asset) => String(asset.id) === String(id)) ?? null;
      }
    },
    maintenanceRepository: {
      async create(maintenance, historyEntry) {
        const created = { id: maintenances.length + 1, ...maintenance };
        maintenances.push(created);
        history.push({ ...historyEntry, assetId: maintenance.assetId });
        return created;
      },
      async findByAsset(assetId) {
        return maintenances.filter((item) => String(item.assetId) === String(assetId));
      },
      async findByBuilding(buildingId) {
        return maintenances.filter((item) => String(item.buildingId) === String(buildingId));
      }
    },
    audit: {
      async record(entry) {
        auditEntries.push(entry);
      }
    }
  };
}

function setup() {
  const repositories = createRepositories();
  const useCases = createMaintenanceUseCases(
    repositories.maintenanceRepository,
    repositories.assetRepository,
    repositories.audit
  );
  return { ...repositories, useCases };
}

const validInput = {
  maintenanceType: 'preventivo',
  maintenanceDate: '2026-01-15',
  description: '  Revisión general de cables y frenos  '
};

test('registra un mantenimiento asociado al activo con tipo, fecha y descripción', async () => {
  const { useCases } = setup();

  const saved = await useCases.register(1, validInput, 7);

  assert.equal(saved.assetId, 1);
  assert.equal(saved.buildingId, 10);
  assert.equal(saved.maintenanceType, 'preventivo');
  assert.equal(saved.maintenanceDate, '2026-01-15');
  assert.equal(saved.description, 'Revisión general de cables y frenos');
  assert.equal(saved.createdBy, 7);
});

test('guarda el mantenimiento dentro del historial del activo', async () => {
  const { useCases, history } = setup();

  await useCases.register(1, validInput, 7);

  assert.equal(history.length, 1);
  assert.equal(history[0].assetId, 1);
  assert.equal(history[0].changeType, 'mantenimiento');
  assert.equal(history[0].newValue, 'preventivo');
  assert.equal(history[0].reason, 'Revisión general de cables y frenos');
  assert.equal(history[0].createdBy, 7);
});

test('trunca la descripción en el historial a 255 caracteres', async () => {
  const { useCases, history, maintenances } = setup();
  const longDescription = 'x'.repeat(400);

  await useCases.register(1, { ...validInput, description: longDescription });

  assert.equal(history[0].reason.length, 255);
  assert.equal(maintenances[0].description.length, 400);
});

test('registra auditoría del mantenimiento', async () => {
  const { useCases, auditEntries } = setup();

  const saved = await useCases.register(1, validInput, 7);

  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].module, 'maintenance');
  assert.equal(auditEntries[0].entity, 'maintenance');
  assert.equal(auditEntries[0].entityId, saved.id);
  assert.equal(auditEntries[0].buildingId, 10);
});

test('rechaza registrar mantenimiento sobre un activo inexistente', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(99, validInput), {
    statusCode: 404,
    code: 'ASSET_NOT_FOUND'
  });
});

test('rechaza registrar mantenimiento sobre un activo retirado', async () => {
  const { useCases, maintenances } = setup();

  await assert.rejects(() => useCases.register(2, validInput), {
    statusCode: 409,
    code: 'ASSET_RETIRED'
  });
  assert.equal(maintenances.length, 0);
});

test('rechaza un tipo de mantenimiento inválido', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...validInput, maintenanceType: 'otro' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('rechaza una fecha con formato inválido', async () => {
  const { useCases } = setup();

  await assert.rejects(
    () => useCases.register(1, { ...validInput, maintenanceDate: '15/01/2026' }),
    { statusCode: 400, code: 'VALIDATION_ERROR' }
  );
});

test('rechaza una fecha futura', async () => {
  const { useCases } = setup();
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  const futureDate = future.toISOString().slice(0, 10);

  await assert.rejects(() => useCases.register(1, { ...validInput, maintenanceDate: futureDate }), {
    statusCode: 400,
    message: 'La fecha del mantenimiento no puede ser futura.'
  });
});

test('rechaza una descripción vacía', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...validInput, description: '   ' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('lista los mantenimientos de un activo', async () => {
  const { useCases } = setup();
  await useCases.register(1, validInput);
  await useCases.register(3, validInput);

  const list = await useCases.listByAsset(1);

  assert.equal(list.length, 1);
  assert.equal(list[0].assetId, 1);
});

test('lista los mantenimientos de un edificio', async () => {
  const { useCases } = setup();
  await useCases.register(1, validInput);
  await useCases.register(3, validInput);

  const list = await useCases.listByBuilding(20);

  assert.equal(list.length, 1);
  assert.equal(list[0].assetId, 3);
});
