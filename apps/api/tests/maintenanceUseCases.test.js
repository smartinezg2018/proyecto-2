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
  const statusHistory = [];
  const auditEntries = [];

  return {
    history,
    maintenances,
    statusHistory,
    auditEntries,
    assetRepository: {
      async findById(id) {
        return assets.find((asset) => String(asset.id) === String(id)) ?? null;
      }
    },
    maintenanceRepository: {
      async create(maintenance, historyEntry, statusChange) {
        const created = { id: maintenances.length + 1, ...maintenance };
        maintenances.push(created);
        history.push({ ...historyEntry, assetId: maintenance.assetId });
        if (statusChange) {
          statusHistory.push({
            id: statusHistory.length + 1,
            maintenanceId: created.id,
            changedByName: statusChange.changedBy === 7 ? 'Ana Martínez' : null,
            ...statusChange
          });
        }
        return created;
      },
      async findById(id) {
        return maintenances.find((item) => String(item.id) === String(id)) ?? null;
      },
      async findByAsset(assetId) {
        return maintenances.filter((item) => String(item.assetId) === String(assetId));
      },
      async findByBuilding(buildingId) {
        return maintenances.filter((item) => String(item.buildingId) === String(buildingId));
      },
      async updateStatus(id, status, updatedBy, statusChange) {
        const current = maintenances.find((item) => String(item.id) === String(id));
        current.status = status;
        current.updatedBy = updatedBy;
        statusHistory.push({
          id: statusHistory.length + 1,
          maintenanceId: current.id,
          changedByName: statusChange.changedBy === 7 ? 'Ana Martínez' : null,
          ...statusChange
        });
        return { ...current };
      },
      async findStatusHistory(maintenanceId) {
        return statusHistory.filter(
          (entry) => String(entry.maintenanceId) === String(maintenanceId)
        );
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

const correctiveInput = {
  maintenanceType: 'correctivo',
  maintenanceDate: '2026-02-10',
  failure: '  Fuga de aceite en la bomba  ',
  cause: '  Sello hidráulico desgastado  ',
  actionsTaken: '  Reemplazo del sello y purga del circuito  '
};

test('registra un mantenimiento correctivo con falla, causa y acciones ejecutadas', async () => {
  const { useCases, maintenances } = setup();

  const saved = await useCases.register(1, correctiveInput, 7);

  assert.equal(saved.assetId, 1);
  assert.equal(saved.buildingId, 10);
  assert.equal(saved.maintenanceType, 'correctivo');
  assert.equal(saved.maintenanceDate, '2026-02-10');
  assert.equal(saved.failureDescription, 'Fuga de aceite en la bomba');
  assert.equal(saved.cause, 'Sello hidráulico desgastado');
  assert.equal(saved.actionsTaken, 'Reemplazo del sello y purga del circuito');
  assert.equal(saved.createdBy, 7);
  assert.equal(maintenances.length, 1);
});

test('deriva la descripción del correctivo cuando no se envía', async () => {
  const { useCases, maintenances } = setup();

  await useCases.register(1, correctiveInput);

  assert.equal(
    maintenances[0].description,
    'Falla: Fuga de aceite en la bomba | Causa: Sello hidráulico desgastado | Acciones: Reemplazo del sello y purga del circuito'
  );
});

test('respeta la descripción enviada cuando se registra un correctivo', async () => {
  const { useCases, maintenances } = setup();

  await useCases.register(1, { ...correctiveInput, description: '  Resumen operativo  ' });

  assert.equal(maintenances[0].description, 'Resumen operativo');
});

test('registra auditoría con detalles del correctivo', async () => {
  const { useCases, auditEntries } = setup();

  await useCases.register(1, correctiveInput, 7);

  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].metadata.failure, 'Fuga de aceite en la bomba');
  assert.equal(auditEntries[0].metadata.cause, 'Sello hidráulico desgastado');
  assert.equal(auditEntries[0].metadata.actionsTaken, 'Reemplazo del sello y purga del circuito');
});

test('rechaza un correctivo sin falla', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...correctiveInput, failure: '   ' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('rechaza un correctivo sin causa', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...correctiveInput, cause: undefined }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('rechaza un correctivo sin acciones ejecutadas', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...correctiveInput, actionsTaken: '' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('un mantenimiento nuevo inicia en programado y registra usuario y fecha', async () => {
  const { useCases, statusHistory } = setup();

  const saved = await useCases.register(1, { ...validInput, status: 'finalizado' }, 7);

  assert.equal(saved.status, 'programado');
  assert.deepEqual(saved.nextStatuses, ['en_ejecucion', 'cancelado']);
  assert.equal(statusHistory.length, 1);
  assert.equal(statusHistory[0].maintenanceId, saved.id);
  assert.equal(statusHistory[0].fromStatus, null);
  assert.equal(statusHistory[0].toStatus, 'programado');
  assert.equal(statusHistory[0].changedBy, 7);
  assert.ok(statusHistory[0].changedAt instanceof Date);
});

test('pasa un mantenimiento de programado a en ejecución y guarda el cambio', async () => {
  const { useCases, statusHistory, auditEntries } = setup();
  const saved = await useCases.register(1, validInput, 7);

  const updated = await useCases.changeStatus(saved.id, { status: 'en_ejecucion' }, 7);

  assert.equal(updated.status, 'en_ejecucion');
  assert.deepEqual(updated.nextStatuses, ['finalizado', 'cancelado']);
  assert.equal(statusHistory.length, 2);
  assert.equal(statusHistory[1].fromStatus, 'programado');
  assert.equal(statusHistory[1].toStatus, 'en_ejecucion');
  assert.equal(statusHistory[1].changedBy, 7);
  assert.ok(statusHistory[1].changedAt instanceof Date);
  assert.equal(auditEntries.at(-1).action, 'status_change');
  assert.equal(auditEntries.at(-1).metadata.from, 'programado');
  assert.equal(auditEntries.at(-1).metadata.to, 'en_ejecucion');
  assert.equal(auditEntries.at(-1).userId, 7);
});

test('permite finalizar o cancelar un mantenimiento en ejecución', async () => {
  const { useCases } = setup();
  const first = await useCases.register(1, validInput, 7);
  await useCases.changeStatus(first.id, { status: 'en_ejecucion' }, 7);
  const finished = await useCases.changeStatus(first.id, { status: 'finalizado' }, 7);
  assert.equal(finished.status, 'finalizado');
  assert.deepEqual(finished.nextStatuses, []);

  const second = await useCases.register(1, validInput, 7);
  await useCases.changeStatus(second.id, { status: 'en_ejecucion' }, 7);
  const cancelled = await useCases.changeStatus(second.id, { status: 'cancelado' }, 7);
  assert.equal(cancelled.status, 'cancelado');
});

test('permite cancelar un mantenimiento programado', async () => {
  const { useCases } = setup();
  const saved = await useCases.register(1, validInput, 7);

  const updated = await useCases.changeStatus(saved.id, { status: 'cancelado' }, 7);

  assert.equal(updated.status, 'cancelado');
});

test('lista el historial de estados con fecha y usuario en orden cronológico', async () => {
  const { useCases } = setup();
  const saved = await useCases.register(1, validInput, 7);
  await useCases.changeStatus(saved.id, { status: 'en_ejecucion' }, 7);

  const history = await useCases.listStatusHistory(saved.id);

  assert.equal(history.length, 2);
  assert.equal(history[0].toStatus, 'programado');
  assert.equal(history[0].changedBy, 7);
  assert.equal(history[0].changedByName, 'Ana Martínez');
  assert.ok(history[0].changedAt instanceof Date);
  assert.equal(history[1].fromStatus, 'programado');
  assert.equal(history[1].toStatus, 'en_ejecucion');
  assert.ok(history[0].changedAt.getTime() <= history[1].changedAt.getTime());
});

test('rechaza un estado de mantenimiento inválido', async () => {
  const { useCases } = setup();
  const saved = await useCases.register(1, validInput, 7);

  await assert.rejects(() => useCases.changeStatus(saved.id, { status: 'activo' }, 7), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('rechaza dejar el mantenimiento en el mismo estado', async () => {
  const { useCases, statusHistory } = setup();
  const saved = await useCases.register(1, validInput, 7);

  await assert.rejects(() => useCases.changeStatus(saved.id, { status: 'programado' }, 7), {
    statusCode: 409,
    code: 'UNCHANGED_MAINTENANCE_STATUS'
  });
  assert.equal(statusHistory.length, 1);
});

test('rechaza saltar de programado a finalizado', async () => {
  const { useCases } = setup();
  const saved = await useCases.register(1, validInput, 7);

  await assert.rejects(() => useCases.changeStatus(saved.id, { status: 'finalizado' }, 7), {
    statusCode: 409,
    code: 'INVALID_STATUS_TRANSITION'
  });
});

test('rechaza cambiar un mantenimiento finalizado o cancelado', async () => {
  const { useCases } = setup();
  const finished = await useCases.register(1, validInput, 7);
  await useCases.changeStatus(finished.id, { status: 'en_ejecucion' }, 7);
  await useCases.changeStatus(finished.id, { status: 'finalizado' }, 7);

  await assert.rejects(() => useCases.changeStatus(finished.id, { status: 'cancelado' }, 7), {
    statusCode: 409,
    code: 'INVALID_STATUS_TRANSITION'
  });

  const cancelled = await useCases.register(1, validInput, 7);
  await useCases.changeStatus(cancelled.id, { status: 'cancelado' }, 7);

  await assert.rejects(() => useCases.changeStatus(cancelled.id, { status: 'en_ejecucion' }, 7), {
    statusCode: 409,
    code: 'INVALID_STATUS_TRANSITION'
  });
});

test('rechaza actualizar el estado de un mantenimiento inexistente', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.changeStatus(99, { status: 'en_ejecucion' }, 7), {
    statusCode: 404,
    code: 'MAINTENANCE_NOT_FOUND'
  });
});
