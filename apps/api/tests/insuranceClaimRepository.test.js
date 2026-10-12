import test from 'node:test';
import assert from 'node:assert/strict';
import { InsuranceClaimRepository } from '../src/modules/insurance/infrastructure/insuranceClaimRepository.js';

test('historial de reclamaciones: filtra con parámetros SQL y conserva el edificio', async () => {
  const calls = [];
  const pool = {
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return [[]];
    }
  };
  const repository = new InsuranceClaimRepository(pool);
  assert.deepEqual(await repository.findByBuilding(1, { policyId: 10, assetId: 20 }), []);
  assert.match(calls[0].sql, /c\.building_id = \?/);
  assert.match(calls[0].sql, /c\.policy_id = \?/);
  assert.match(calls[0].sql, /filter_ca\.asset_id = \?/);
  assert.deepEqual(calls[0].parameters, [1, 10, 20]);
});
