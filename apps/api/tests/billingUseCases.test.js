import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingUseCases } from '../src/modules/billing/application/billingUseCases.js';

test('genera facturas ordinarias sin repetir apartamentos', async () => {
  const calls = [];
  const useCases = createBillingUseCases({
    async createOrdinaryInvoices(input) {
      calls.push(input);
      return [{ id: 1, total: 250000 }];
    }
  });

  const invoices = await useCases.generateOrdinaryInvoices(
    {
      buildingId: 4,
      period: '2026-10',
      unitIds: [10, 11],
      concept: 'Cuota ordinaria',
      baseAmount: 500000,
      dueDate: '2026-10-10'
    },
    7
  );

  assert.equal(invoices[0].id, 1);
  assert.deepEqual(calls[0].unitIds, [10, 11]);
  assert.equal(calls[0].createdBy, 7);
});

test('rechaza apartamentos repetidos', async () => {
  const useCases = createBillingUseCases({ createOrdinaryInvoices: async () => [] });

  await assert.rejects(
    () =>
      useCases.generateOrdinaryInvoices(
        {
          buildingId: 4,
          period: '2026-10',
          unitIds: [10, 10],
          concept: 'Cuota ordinaria',
          baseAmount: 500000,
          dueDate: '2026-10-10'
        },
        7
      ),
    { code: 'DUPLICATE_UNITS', statusCode: 400 }
  );
});
