import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceAlertUseCases } from '../src/modules/maintenance/application/maintenanceAlertUseCases.js';

function setup() {
  const settings = new Map();
  const alerts = [];
  const maintenances = [
    {
      id: 1,
      buildingId: 10,
      maintenanceType: 'preventivo',
      status: 'programado',
      maintenanceDate: '2026-10-20',
      nextExecutionDate: '2026-11-20',
      createdAt: '2026-10-01T12:00:00.000Z',
      responsible: 'Ana'
    },
    {
      id: 2,
      buildingId: 10,
      maintenanceType: 'preventivo',
      status: 'programado',
      maintenanceDate: '2027-12-01',
      nextExecutionDate: '2028-01-01',
      createdAt: '2026-10-01T12:00:00.000Z',
      responsible: 'Carlos'
    }
  ];

  const alertRepository = {
    async getSettings(buildingId) {
      return settings.get(String(buildingId)) ?? { alertDays: 7 };
    },
    async saveSettings(buildingId, alertDays) {
      const value = { alertDays };
      settings.set(String(buildingId), value);
      return value;
    },
    async ensureAlert({ buildingId, maintenanceId, targetDate }) {
      const exists = alerts.some(
        (alert) =>
          String(alert.maintenanceId) === String(maintenanceId) && alert.targetDate === targetDate
      );
      if (exists) {
        return;
      }
      alerts.push({
        id: alerts.length + 1,
        buildingId,
        maintenanceId,
        targetDate,
        status: 'pendiente'
      });
    },
    async findByBuilding(buildingId) {
      return alerts.filter((alert) => String(alert.buildingId) === String(buildingId));
    },
    async findById(id) {
      return alerts.find((alert) => String(alert.id) === String(id)) ?? null;
    },
    async markAttended(id, userId) {
      const current = alerts.find((alert) => String(alert.id) === String(id));
      current.status = 'atendida';
      current.attendedBy = userId;
      return current;
    }
  };

  const useCases = createMaintenanceAlertUseCases(
    alertRepository,
    {
      async findOpenForAlertsByBuilding(buildingId) {
        return maintenances.filter(
          (item) =>
            String(item.buildingId) === String(buildingId) &&
            ['programado', 'en_ejecucion'].includes(item.status ?? 'programado')
        );
      }
    },
    {
      async findById(id) {
        return Number(id) === 10 ? { id: 10 } : null;
      }
    },
    () => '2026-10-15'
  );

  return { useCases, alerts, maintenances };
}

test('genera una alerta para el preventivo próximo y no duplica', async () => {
  const { useCases, alerts } = setup();

  const first = await useCases.list(10);
  const second = await useCases.list(10);

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(alerts[0].targetDate, '2026-10-20');
  assert.equal(alerts[0].status, 'pendiente');
});

test('avisa el mismo día de ejecución si está dentro de la anticipación', async () => {
  const { useCases, maintenances } = setup();
  maintenances.push({
    id: 3,
    buildingId: 10,
    maintenanceType: 'preventivo',
    status: 'programado',
    maintenanceDate: '2026-10-15',
    createdAt: '2026-10-15T17:00:00.000Z',
    responsible: 'Felipe'
  });

  const listed = await useCases.list(10);
  assert.equal(listed.length, 2);
  assert.deepEqual(
    listed.map((alert) => alert.targetDate).sort(),
    ['2026-10-15', '2026-10-20']
  );
});

test('oculta alertas viejas que ya no corresponden a la fecha de ejecución', async () => {
  const { useCases, alerts } = setup();
  alerts.push({
    id: 99,
    buildingId: 10,
    maintenanceId: 1,
    targetDate: '2026-10-12',
    status: 'pendiente'
  });

  const listed = await useCases.list(10);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].targetDate, '2026-10-20');
});

test('genera una alerta para un correctivo próximo y omite el que está fuera de la ventana', async () => {
  const { useCases, maintenances } = setup();
  maintenances.push(
    {
      id: 4,
      buildingId: 10,
      maintenanceType: 'correctivo',
      status: 'programado',
      maintenanceDate: '2026-10-19',
      failure: 'Frenos'
    },
    {
      id: 5,
      buildingId: 10,
      maintenanceType: 'correctivo',
      status: 'programado',
      maintenanceDate: '2027-03-01',
      failure: 'Motor'
    }
  );

  const listed = await useCases.list(10);
  assert.deepEqual(
    listed.map((alert) => alert.targetDate).sort(),
    ['2026-10-19', '2026-10-20']
  );
});

test('permite configurar la anticipación y marcar una alerta como atendida', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.saveSettings(10, { alertDays: 400 }), {
    statusCode: 400
  });

  const settings = await useCases.saveSettings(10, { alertDays: 30 }, 7);
  assert.equal(settings.alertDays, 30);

  const listed = await useCases.list(10);
  const attended = await useCases.markAttended(listed[0].id, 7);
  assert.equal(attended.status, 'atendida');

  await assert.rejects(() => useCases.markAttended(listed[0].id, 7), {
    statusCode: 409,
    code: 'ALERT_ALREADY_ATTENDED'
  });
});
