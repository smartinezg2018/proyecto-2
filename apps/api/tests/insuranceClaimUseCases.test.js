import test from 'node:test';
import assert from 'node:assert/strict';
import { createInsuranceClaimUseCases } from '../src/modules/insurance/application/insuranceClaimUseCases.js';
import { createInsuranceClaimSchema } from '../src/modules/insurance/presentation/http/schemas.js';

const validInput = {
  policyId: 10,
  claimDate: '2026-10-10',
  description: '  Daño eléctrico  ',
  status: 'reportada',
  claimedAmount: 250000,
  documentRefs: ['acta.pdf'],
  assetIds: [20, 20, 21]
};

function setup({ policyBuilding = 1, assetBuildings = [1, 1] } = {}) {
  let saved;
  let receivedFilters;
  const claimRepository = {
    async findByBuilding(id, filters) {
      receivedFilters = filters;
      return [{ id: 1, buildingId: Number(id) }];
    },
    async create(input) {
      saved = input;
      return { id: 1, ...input };
    }
  };
  const policyRepository = {
    async findById(id) {
      return id === 10 ? { id, buildingId: policyBuilding } : null;
    }
  };
  const assetRepository = {
    async findById(id) {
      const index = [20, 21].indexOf(id);
      return index < 0 ? null : { id, buildingId: assetBuildings[index] };
    }
  };
  const buildingRepository = {
    async findById(id) {
      return Number(id) === 1 ? { id: 1 } : null;
    }
  };
  return {
    get saved() {
      return saved;
    },
    get receivedFilters() {
      return receivedFilters;
    },
    useCases: createInsuranceClaimUseCases(
      claimRepository,
      policyRepository,
      assetRepository,
      buildingRepository,
      () => '2026-10-11'
    )
  };
}

test('HU-038: registra reclamación, documentos y activos sin duplicarlos', async () => {
  const context = setup();
  const claim = await context.useCases.create(1, validInput, 7);
  assert.equal(claim.description, 'Daño eléctrico');
  assert.deepEqual(claim.assetIds, [20, 21]);
  assert.deepEqual(claim.documentRefs, ['acta.pdf']);
  assert.equal(context.saved.createdBy, 7);
});

test('HU-038: rechaza póliza o activo de otro edificio', async () => {
  await assert.rejects(() => setup({ policyBuilding: 2 }).useCases.create(1, validInput), {
    code: 'INVALID_POLICY'
  });
  await assert.rejects(() => setup({ assetBuildings: [1, 2] }).useCases.create(1, validInput), {
    code: 'INVALID_ASSET'
  });
});

test('HU-038: rechaza fecha futura', async () => {
  await assert.rejects(
    () => setup().useCases.create(1, { ...validInput, claimDate: '2026-10-12' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('HU-038: valida campos, estado, valor, fecha y activos', () => {
  assert.equal(createInsuranceClaimSchema.safeParse(validInput).success, true);
  for (const input of [
    { ...validInput, description: '' },
    { ...validInput, status: 'desconocida' },
    { ...validInput, claimedAmount: -1 },
    { ...validInput, claimDate: '2026-02-30' },
    { ...validInput, assetIds: [] }
  ])
    assert.equal(createInsuranceClaimSchema.safeParse(input).success, false);
});

test('HU-038: lista por edificio y rechaza edificio inexistente', async () => {
  const context = setup();
  assert.equal((await context.useCases.list(1, { policyId: 10, assetId: 20 }))[0].buildingId, 1);
  assert.deepEqual(context.receivedFilters, { policyId: 10, assetId: 20 });
  await assert.rejects(() => setup().useCases.list(2), { code: 'BUILDING_NOT_FOUND' });
});

test('historial de reclamaciones: acepta resultado, indemnización y fecha de resolución', async () => {
  const context = setup();
  const input = {
    ...validInput,
    status: 'indemnizada',
    result: '  Indemnización aprobada  ',
    indemnityAmount: 200000,
    resolvedAt: '2026-10-11'
  };
  const parsed = createInsuranceClaimSchema.parse(input);
  const claim = await context.useCases.create(1, parsed, 7);
  assert.equal(claim.result, 'Indemnización aprobada');
  assert.equal(claim.indemnityAmount, 200000);
  assert.equal(claim.resolvedAt, '2026-10-11');
});

test('historial de reclamaciones: rechaza fechas de resolución inválidas', async () => {
  assert.equal(
    createInsuranceClaimSchema.safeParse({ ...validInput, resolvedAt: '2020-01-01' }).success,
    false
  );
  await assert.rejects(
    () =>
      setup().useCases.create(1, {
        ...validInput,
        result: null,
        indemnityAmount: null,
        resolvedAt: '2026-10-12'
      }),
    { code: 'VALIDATION_ERROR' }
  );
});
