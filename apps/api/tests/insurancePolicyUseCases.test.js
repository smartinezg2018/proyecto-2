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

test('HU-037: rechaza anticipaciones inválidas y admite los extremos', () => {
  for (const alertDays of [-1, 366, 1.5, '', null, '30'])
    assert.equal(insuranceAlertSettingsSchema.safeParse({ alertDays }).success, false);
  for (const alertDays of [0, 30, 365])
    assert.equal(insuranceAlertSettingsSchema.safeParse({ alertDays }).success, true);
});

test('el registro rechaza fechas imposibles, invertidas e iguales', () => {
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

test('HU-037: guarda por edificio y recalcula con la configuración nueva', async () => {
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

function policyFixture(overrides = {}) {
  return {
    number: 'POL-100',
    insurer: 'Sura',
    coverages: ['Incendio', 'Terremoto'],
    insuredValue: 250000000,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    assetIds: [4],
    ...overrides
  };
}

function memoryPolicyModule() {
  const policies = [];
  const audits = [];
  const assets = [
    { id: 4, buildingId: 1, code: 'ASC-1', name: 'Ascensor' },
    { id: 8, buildingId: 2, code: 'BOM-1', name: 'Bomba' }
  ];
  const repository = {
    async findByBuilding(buildingId) {
      return policies.filter((policy) => Number(policy.buildingId) === Number(buildingId));
    },
    async findByAsset(buildingId, assetId) {
      return policies.filter(
        (policy) =>
          Number(policy.buildingId) === Number(buildingId) &&
          policy.assets.some((asset) => Number(asset.id) === Number(assetId))
      );
    },
    async findDetailed(id) {
      return policies.find((policy) => Number(policy.id) === Number(id)) ?? null;
    },
    async getSettings() {
      return { alertDays: 30 };
    },
    async create(buildingId, input, userId) {
      const created = {
        id: policies.length + 1,
        buildingId: Number(buildingId),
        ...input,
        createdBy: userId,
        assets: input.assetIds.map((assetId) => assets.find((asset) => asset.id === assetId))
      };
      policies.push(created);
      return created;
    },
    async update(id, input) {
      const index = policies.findIndex((policy) => Number(policy.id) === Number(id));
      policies[index] = {
        ...policies[index],
        ...input,
        assets: input.assetIds.map((assetId) => assets.find((asset) => asset.id === assetId))
      };
      return policies[index];
    }
  };
  const useCases = createInsurancePolicyUseCases(
    repository,
    {
      async findById(id) {
        return Number(id) === 1 ? { id: 1 } : null;
      }
    },
    () => today,
    {
      async findById(id) {
        return assets.find((asset) => asset.id === Number(id)) ?? null;
      }
    },
    {
      audits,
      async record(entry) {
        audits.push(entry);
      }
    }
  );
  return { policies, audits, useCases };
}

test('HU-033 rechaza una vigencia que no termina después de iniciar', async () => {
  const { useCases } = memoryPolicyModule();
  await assert.rejects(() => useCases.create(1, policyFixture({ validUntil: '2026-01-01' }), 5), {
    code: 'VALIDATION_ERROR'
  });
});

test('HU-033 y HU-034 registran coberturas y activos del mismo edificio', async () => {
  const { useCases, audits } = memoryPolicyModule();
  const policy = await useCases.create(1, policyFixture(), 5);
  assert.deepEqual(policy.coverages, ['Incendio', 'Terremoto']);
  assert.deepEqual(
    policy.assets.map((asset) => asset.code),
    ['ASC-1']
  );
  assert.equal(audits[0].action, 'create');
  assert.equal(audits[0].entity, 'insurance_policy');
});

test('HU-034 rechaza un activo de otro edificio', async () => {
  const { useCases } = memoryPolicyModule();
  await assert.rejects(() => useCases.create(1, policyFixture({ assetIds: [8] }), 5), {
    code: 'INVALID_ASSET'
  });
});

test('HU-035 actualiza la póliza y deja el cambio en la auditoría', async () => {
  const { useCases, audits } = memoryPolicyModule();
  const created = await useCases.create(1, policyFixture(), 5);
  const updated = await useCases.update(
    1,
    created.id,
    policyFixture({ insurer: 'Bolívar', insuredValue: 300000000 }),
    9
  );
  assert.equal(updated.insurer, 'Bolívar');
  assert.equal(audits[1].action, 'update');
  assert.equal(
    audits[1].metadata.changes.some((change) => change.field === 'insurer'),
    true
  );
});

test('HU-036 lista solo el edificio y filtra aseguradora, estado y vencimiento', async () => {
  const { useCases, policies } = memoryPolicyModule();
  await useCases.create(1, policyFixture(), 5);
  policies.push({
    id: 50,
    buildingId: 2,
    number: 'OTRA',
    insurer: 'Sura',
    coverage: 'Otra',
    coverages: ['Otra'],
    insuredValue: 1,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    assets: []
  });
  const byBuilding = await useCases.list(1);
  assert.equal(byBuilding.length, 1);
  assert.equal(byBuilding[0].number, 'POL-100');
  assert.equal((await useCases.list(1, { insurer: 'sura' })).length, 1);
  assert.equal((await useCases.list(1, { insurer: 'mapfre' })).length, 0);
  assert.equal((await useCases.list(1, { status: 'Vigente' })).length, 1);
  assert.equal((await useCases.list(1, { status: 'Vencida' })).length, 0);
  assert.equal((await useCases.list(1, { validUntil: '2026-12-31' })).length, 1);
  assert.equal((await useCases.list(1, { validUntil: '2026-06-01' })).length, 0);
  const covered = await useCases.listByAsset(1, 4);
  assert.equal(covered.length, 1);
  assert.equal(covered[0].number, 'POL-100');
});
