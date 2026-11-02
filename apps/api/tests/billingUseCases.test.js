import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingUseCases } from '../src/modules/billing/application/billingUseCases.js';

test('HU-046 pasa los filtros y la fecha de Colombia al consultar cartera', async () => {
  let received;
  const useCases = createBillingUseCases(
    {
      async findPortfolio(input) {
        received = input;
        return [{ unitId: 10, totalBalance: 215000 }];
      }
    },
    () => '2026-11-02'
  );

  const result = await useCases.listPortfolio(4, {
    unitId: 10,
    period: '2026-10',
    status: 'en_mora'
  });

  assert.deepEqual(received, {
    buildingId: 4,
    unitId: 10,
    period: '2026-10',
    status: 'en_mora',
    today: '2026-11-02'
  });
  assert.equal(result[0].totalBalance, 215000);
});

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

test('HU-043 registra un pago asociado al edificio y apartamento', async () => {
  let created;
  const useCases = createBillingUseCases({
    async createPayment(input) {
      created = input;
      return { id: 21, status: 'registrado', ...input };
    }
  });

  const payment = await useCases.registerPayment(
    {
      buildingId: 4,
      unitId: 10,
      paymentDate: '2026-10-15',
      amount: 250000,
      paymentMethod: 'transferencia',
      reference: 'TRX-043-001'
    },
    7
  );

  assert.equal(payment.id, 21);
  assert.equal(created.buildingId, 4);
  assert.equal(created.unitId, 10);
  assert.equal(created.amount, 250000);
  assert.equal(created.paymentMethod, 'transferencia');
  assert.equal(created.reference, 'TRX-043-001');
  assert.equal(created.createdBy, 7);
});

test('HU-043 rechaza un valor de pago inválido', async () => {
  const useCases = createBillingUseCases({ createPayment: async () => ({}) });

  await assert.rejects(
    () =>
      useCases.registerPayment(
        {
          buildingId: 4,
          unitId: 10,
          paymentDate: '2026-10-15',
          amount: 0,
          paymentMethod: 'efectivo',
          reference: 'TRX-043-000'
        },
        7
      ),
    { code: 'VALIDATION_ERROR', statusCode: 400 }
  );
});

test('HU-044 aplica un pago en modo automático', async () => {
  let received;
  const useCases = createBillingUseCases({
    async applyPayment(input) {
      received = input;
      return { id: input.paymentId, status: 'aplicado', creditBalance: 50000, allocations: [] };
    }
  });

  const payment = await useCases.applyPayment(4, 21, { mode: 'auto' });
  assert.equal(payment.status, 'aplicado');
  assert.deepEqual(received, {
    buildingId: 4,
    paymentId: 21,
    mode: 'auto',
    allocations: []
  });
});

test('HU-044 exige facturas en la aplicación manual', async () => {
  const useCases = createBillingUseCases({ applyPayment: async () => ({}) });

  await assert.rejects(
    () => useCases.applyPayment(4, 21, { mode: 'manual', allocations: [] }),
    { code: 'VALIDATION_ERROR', statusCode: 400 }
  );
});
