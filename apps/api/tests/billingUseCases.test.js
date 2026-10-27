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

test('distribuye un cobro extraordinario en las cuotas solicitadas', async () => {
  let created;
  const useCases = createBillingUseCases({
    async createExtraordinaryCharges(input) {
      created = input;
      return [{ scheduledPeriod: '2026-11', amount: 50000 }];
    }
  });

  await useCases.generateExtraordinaryCharges(
    {
      buildingId: 4,
      unitIds: [10],
      originPeriod: '2026-10',
      startPeriod: '2026-11',
      concept: 'Impermeabilización',
      totalAmount: 150000,
      installments: 3,
      approvalReference: 'Acta 12'
    },
    7
  );

  assert.equal(created.installments, 3);
  assert.equal(created.createdBy, 7);
});

test('programa cobros retroactivos en los periodos definidos', async () => {
  let created;
  const useCases = createBillingUseCases({
    async createRetroactiveCharges(input) {
      created = input;
      return [];
    }
  });

  test('genera la información de una colilla para una factura existente', async () => {
    const useCases = createBillingUseCases({
      async findPaymentSlip() {
        return { id: 8, total: 100000 };
      }
    });

    const slip = await useCases.generatePaymentSlip(8);
    assert.equal(slip.id, 8);
  });

  await useCases.generateRetroactiveCharges(
    {
      buildingId: 4,
      unitIds: [10],
      originPeriod: '2026-08',
      startPeriod: '2026-10',
      concept: 'Ajuste de vigilancia',
      totalAmount: 100000,
      installments: 1
    },
    7
  );

  assert.equal(created.originPeriod, '2026-08');
  assert.equal(created.installments, 1);
});
