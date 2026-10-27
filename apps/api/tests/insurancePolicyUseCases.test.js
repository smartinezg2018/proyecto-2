import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colombiaDate,
  policyExpiration,
  createInsurancePolicyUseCases
} from '../src/modules/insurance/application/insurancePolicyUseCases.js';
import {
  createInsurancePolicySchema,
  insuranceAlertSettingsSchema
} from '../src/modules/insurance/presentation/http/schemas.js';

const today = '2026-10-11';
for (const [end, days, status, remaining] of [
  ['2026-10-10', 30, 'Vencida', -1],
  ['2026-10-11', 0, 'Próxima a vencer', 0],
  ['2026-10-12', 0, 'Vigente', 1],
  ['2026-11-10', 30, 'Próxima a vencer', 30],
  ['2026-11-11', 30, 'Vigente', 31]
]) {
  test(`HU-037: vencimiento ${end}, anticipación ${days}: ${status}`, () => {
    const result = policyExpiration({ validFrom: '2026-01-01', validUntil: end }, days, today);
    assert.equal(result.expirationStatus, status);
    assert.equal(result.daysRemaining, remaining);
  });
}

test('HU-037: una póliza futura no se presenta como vigente', () => {
  assert.equal(
    policyExpiration({ validFrom: '2026-10-12', validUntil: '2026-10-20' }, 30, today)
      .expirationStatus,
    'Pendiente de inicio'
  );
});

test('HU-037: usa la fecha de Colombia alrededor de medianoche UTC', () => {
  assert.equal(colombiaDate(new Date('2026-10-12T04:59:59Z')), '2026-10-11');
  assert.equal(colombiaDate(new Date('2026-10-12T05:00:00Z')), '2026-10-12');
});

test('HU-037: diferencia de días correcta en año bisiesto', () => {
  assert.equal(
    policyExpiration({ validFrom: '2024-01-01', validUntil: '2024-03-01' }, 2, '2024-02-28')
      .daysRemaining,
    2
  );
});

test('HU-037 / CP-037-02: rechaza anticipaciones inválidas y admite extremos', () => {
  for (const alertDays of [-1, 366, 1.5, '', null, '30'])
    assert.equal(insuranceAlertSettingsSchema.safeParse({ alertDays }).success, false);
  for (const alertDays of [0, 30, 365])
    assert.equal(insuranceAlertSettingsSchema.safeParse({ alertDays }).success, true);
});

test('HU-033 / CP-033-02: rechaza fechas imposibles, invertidas e iguales', () => {
  const input = {
    number: 'P1',
    insurer: 'Seguros',
    coverage: 'General',
    insuredValue: 100,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31'
  };
  assert.equal(createInsurancePolicySchema.safeParse(input).success, true);
  for (const validUntil of ['2026-02-30', '2025-12-31', '2026-01-01']) {
    assert.equal(createInsurancePolicySchema.safeParse({ ...input, validUntil }).success, false);
  }
});

test('HU-033 / CP-033-01: registra todos los datos de una póliza', async () => {
  let saved;
  const useCases = createInsurancePolicyUseCases(
    {
      async create(buildingId, input, userId) {
        saved = { id: 1, buildingId: Number(buildingId), ...input, createdBy: userId };
        return saved;
      }
    },
    {
      async findById(id) {
        return Number(id) === 1 ? { id: 1 } : null;
      }
    }
  );
  const input = createInsurancePolicySchema.parse({
    number: 'POL-001',
    insurer: 'Seguros Andinos',
    coverage: 'Incendio y terremoto',
    insuredValue: 500000000,
    validFrom: '2026-01-01',
    validUntil: '2027-01-01'
  });

  assert.deepEqual(await useCases.create(1, input, 7), saved);
  assert.equal(saved.coverage, 'Incendio y terremoto');
  assert.equal(saved.insuredValue, 500000000);
  assert.equal(saved.createdBy, 7);
});

test('HU-037 / CP-037-01: guarda anticipación y recalcula la clasificación', async () => {
  const settings = new Map();
  const repository = {
    async getSettings(id) {
      return settings.get(id) ?? { alertDays: 30 };
    },
    async saveSettings(id, alertDays) {
      const value = { alertDays };
      settings.set(id, value);
      return value;
    },
    async findByBuilding(id) {
      return [{ buildingId: id, validFrom: '2026-01-01', validUntil: '2026-11-01' }];
    }
  };
  const useCases = createInsurancePolicyUseCases(
    repository,
    {
      async findById(id) {
        return id < 3 ? { id } : null;
      }
    },
    () => today
  );
  assert.equal((await useCases.list(1))[0].expirationStatus, 'Próxima a vencer');
  await useCases.saveSettings(1, { alertDays: 10 }, 7);
  assert.equal((await useCases.list(1))[0].expirationStatus, 'Vigente');
  assert.deepEqual(await useCases.getSettings(2), { alertDays: 30 });
  await assert.rejects(() => useCases.saveSettings(1, { alertDays: -1 }), {
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(() => useCases.getSettings(9), { code: 'BUILDING_NOT_FOUND' });
});
