import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { createIntegrationHarness } from './helpers/integrationHarness.js';

describe('Integración facturación HU-040 a HU-051', { concurrency: false }, async () => {
  const h = await createIntegrationHarness('billing');
  after(() => h.close());
  const cookie = await h.login();
  const operator = await h.login('operador@example.com', 'Operador123!');
  const { buildings } = await h.ids();
  const [building1, building2] = buildings;
  const [result] = await h.database.query(
    `INSERT INTO units (building_id, number, tower, kind, coefficient, status)
     VALUES (?, 'T-101', 'T', 'apartamento', 1.000000, 'ocupado'),
            (?, 'T-102', 'T', 'apartamento', 0.500000, 'ocupado'),
            (?, 'T-103', 'T', 'apartamento', 1.000000, 'ocupado'),
            (?, 'T-104', 'T', 'apartamento', 1.000000, 'ocupado'),
            (?, 'T-105', 'T', 'apartamento', 1.000000, 'ocupado'),
            (?, 'X-201', 'X', 'apartamento', 1.000000, 'ocupado')`,
    [building1.id, building1.id, building1.id, building1.id, building1.id, building2.id]
  );
  const unit1 = result.insertId;
  const unit2 = unit1 + 1;
  const unit3 = unit1 + 2;
  const unit4 = unit1 + 3;
  const unit5 = unit1 + 4;
  const foreignUnit = unit1 + 5;

  const post = (path, body, auth = cookie) =>
    h.request(path, { method: 'POST', body, cookie: auth });
  const ordinary = (period, ids = [unit1], amount = 100000) =>
    post(`/api/v1/billing/buildings/${building1.id}/invoices/ordinary`, {
      period,
      unitIds: ids,
      concept: `Administración ${period}`,
      baseAmount: amount,
      dueDate: `${period}-20`
    });
  const payment = (reference, amount = 100000, id = unit1) =>
    post(`/api/v1/billing/buildings/${building1.id}/payments`, {
      unitId: id,
      paymentDate: '2026-06-10',
      amount,
      paymentMethod: 'transferencia',
      reference
    });

  test('HU-040 / IT-040-01 genera facturas con concepto, total y vencimiento', async () => {
    const response = await ordinary('2026-01', [unit1, unit2]);
    assert.equal(response.status, 201);
    assert.deepEqual(
      response.payload.data.map((row) => row.total),
      [100000, 50000]
    );
    assert.equal(response.payload.data[0].items[0].concept, 'Administración 2026-01');
    assert.equal(response.payload.data[0].dueDate, '2026-01-20');
  });

  test('HU-040 / IT-040-02 rechaza unidades repetidas o ajenas sin facturas parciales', async () => {
    assert.equal((await ordinary('2026-02', [unit1, unit1])).status, 400);
    assert.equal((await ordinary('2026-02', [unit1, foreignUnit])).status, 400);
    const [rows] = await h.database.query("SELECT id FROM invoices WHERE period='2026-02'");
    assert.equal(rows.length, 0);
  });

  test('HU-041 / IT-041-01 distribuye cuotas extraordinarias conservando el total', async () => {
    const response = await post(`/api/v1/billing/buildings/${building1.id}/charges/extraordinary`, {
      unitIds: [unit1],
      originPeriod: '2026-01',
      startPeriod: '2026-03',
      concept: 'Fachada',
      totalAmount: 100000,
      installments: 3,
      approvalReference: 'ACTA-10'
    });
    assert.equal(response.status, 201);
    assert.equal(
      response.payload.data.reduce((sum, row) => sum + row.amount, 0),
      100000
    );
    assert.deepEqual(
      response.payload.data.map((row) => row.scheduledPeriod),
      ['2026-03', '2026-04', '2026-05']
    );
    assert.ok(response.payload.data.every((row) => row.approvalReference === 'ACTA-10'));
  });

  test('HU-041 / IT-041-02 rechaza periodo, unidad y permiso inválidos', async () => {
    const body = {
      unitIds: [foreignUnit],
      originPeriod: '2026-05',
      startPeriod: '2026-04',
      concept: 'Obra',
      totalAmount: 10,
      installments: 2,
      approvalReference: 'A-1'
    };
    assert.equal(
      (await post(`/api/v1/billing/buildings/${building1.id}/charges/extraordinary`, body)).status,
      400
    );
    assert.equal(
      (
        await post(
          `/api/v1/billing/buildings/${building1.id}/charges/extraordinary`,
          { ...body, unitIds: [unit1], startPeriod: '2026-05' },
          operator
        )
      ).status,
      403
    );
  });

  test('HU-042 / IT-042-01 programa cobros retroactivos en periodos consecutivos', async () => {
    const response = await post(`/api/v1/billing/buildings/${building1.id}/charges/retroactive`, {
      unitIds: [unit2],
      originPeriod: '2025-12',
      startPeriod: '2026-06',
      concept: 'Ajuste',
      totalAmount: 90000,
      installments: 2
    });
    assert.equal(response.status, 201);
    assert.deepEqual(
      response.payload.data.map((row) => row.scheduledPeriod),
      ['2026-06', '2026-07']
    );
    assert.equal(
      response.payload.data.reduce((sum, row) => sum + row.amount, 0),
      90000
    );
  });

  test('HU-042 / IT-042-02 rechaza origen posterior y apartamento de otro edificio', async () => {
    const path = `/api/v1/billing/buildings/${building1.id}/charges/retroactive`;
    const body = {
      unitIds: [unit1],
      originPeriod: '2026-08',
      startPeriod: '2026-07',
      concept: 'Ajuste',
      totalAmount: 100,
      installments: 1
    };
    assert.equal((await post(path, body)).status, 400);
    assert.equal(
      (await post(path, { ...body, unitIds: [foreignUnit], originPeriod: '2026-07' })).status,
      400
    );
  });

  test('HU-043 / IT-043-01 persiste el pago en edificio y apartamento correctos', async () => {
    const response = await payment('PAGO-043');
    assert.equal(response.status, 201);
    assert.equal(response.payload.data.buildingId, Number(building1.id));
    assert.equal(response.payload.data.unitId, unit1);
    assert.equal(response.payload.data.paymentMethod, 'transferencia');
  });

  test('HU-043 / IT-043-02 rechaza monto, apartamento y permiso inválidos', async () => {
    assert.equal((await payment('PAGO-CERO', 0)).status, 400);
    assert.equal((await payment('PAGO-AJENO', 10, foreignUnit)).status, 400);
    const denied = await post(
      `/api/v1/billing/buildings/${building1.id}/payments`,
      {
        unitId: unit1,
        paymentDate: '2026-06-10',
        amount: 10,
        paymentMethod: 'efectivo',
        reference: 'SIN-PERMISO'
      },
      operator
    );
    assert.equal(denied.status, 403);
  });

  test('HU-044 / IT-044-01 aplica por antigüedad y conserva saldo a favor', async () => {
    const invoice = (await ordinary('2026-03', [unit3], 50000)).payload.data[0];
    const registered = (await payment('PAGO-044', 70000, unit3)).payload.data;
    const applied = await post(
      `/api/v1/billing/buildings/${building1.id}/payments/${registered.id}/apply`,
      { mode: 'auto' }
    );
    assert.equal(applied.status, 200);
    assert.equal(applied.payload.data.allocations[0].invoiceId, invoice.id);
    assert.equal(applied.payload.data.creditBalance, 20000);
  });

  test('HU-044 / IT-044-02 revierte la transacción ante sobreasignación o segunda aplicación', async () => {
    const invoice = (await ordinary('2026-04', [unit2], 20000)).payload.data[0];
    const registered = (await payment('PAGO-044-ERR', 10000, unit2)).payload.data;
    const path = `/api/v1/billing/buildings/${building1.id}/payments/${registered.id}/apply`;
    assert.equal(
      (
        await post(path, {
          mode: 'manual',
          allocations: [{ invoiceId: invoice.id, amount: 20000 }]
        })
      ).status,
      400
    );
    assert.equal((await post(path, { mode: 'auto' })).status, 200);
    assert.equal((await post(path, { mode: 'auto' })).status, 409);
  });

  test('HU-045 / IT-045-01 actualiza factura de pendiente a parcial y pagada', async () => {
    const invoice = (await ordinary('2026-05', [unit4], 100000)).payload.data[0];
    const first = (await payment('PAGO-045-A', 40000, unit4)).payload.data;
    await post(`/api/v1/billing/buildings/${building1.id}/payments/${first.id}/apply`, {
      mode: 'auto'
    });
    let [rows] = await h.database.query('SELECT status FROM invoices WHERE id=?', [invoice.id]);
    assert.equal(rows[0].status, 'parcialmente_pagada');
    const second = (await payment('PAGO-045-B', 60000, unit4)).payload.data;
    await post(`/api/v1/billing/buildings/${building1.id}/payments/${second.id}/apply`, {
      mode: 'auto'
    });
    [rows] = await h.database.query('SELECT status FROM invoices WHERE id=?', [invoice.id]);
    assert.equal(rows[0].status, 'pagada');
  });

  test('HU-045 / IT-045-02 recalcula el estado después de reversar un pago', async () => {
    const invoice = (await ordinary('2026-08', [unit2], 30000)).payload.data[0];
    const paid = (await payment('PAGO-045-REV', 30000, unit2)).payload.data;
    await post(`/api/v1/billing/buildings/${building1.id}/payments/${paid.id}/apply`, {
      mode: 'auto'
    });
    await h.database.query("UPDATE payments SET status='reversado' WHERE id=?", [paid.id]);
    const sync = await post(
      `/api/v1/billing/buildings/${building1.id}/payments/${paid.id}/sync-invoice-statuses`,
      {}
    );
    assert.equal(sync.status, 200);
    const [rows] = await h.database.query('SELECT status FROM invoices WHERE id=?', [invoice.id]);
    assert.equal(rows[0].status, 'pendiente');
  });

  test('HU-048 / IT-048-01 genera recibo consecutivo con pago, facturas y saldo', async () => {
    await ordinary('2026-09', [unit5], 20000);
    const paid = (await payment('PAGO-048', 25000, unit5)).payload.data;
    await post(`/api/v1/billing/buildings/${building1.id}/payments/${paid.id}/apply`, {
      mode: 'auto'
    });
    const receipt = await h.request(
      `/api/v1/billing/buildings/${building1.id}/payments/${paid.id}/cash-receipt?format=json`,
      { cookie }
    );
    assert.equal(receipt.status, 200);
    assert.equal(receipt.payload.data.receiptNumber > 0, true);
    assert.equal(receipt.payload.data.creditBalance, 5000);
    assert.equal(receipt.payload.data.invoices.length, 1);
  });

  test('HU-048 / IT-048-02 protege recibos inexistentes y entrega HTML', async () => {
    const missing = await h.request(
      `/api/v1/billing/buildings/${building1.id}/payments/999999/cash-receipt?format=json`,
      { cookie }
    );
    assert.equal(missing.status, 404);
    const denied = await h.request(
      `/api/v1/billing/buildings/${building1.id}/payments/1/cash-receipt`,
      { cookie: operator, raw: true }
    );
    assert.equal(denied.status, 403);
  });

  test('HU-051 / IT-051-01 genera colilla HTML con los datos requeridos', async () => {
    const invoice = (await ordinary('2026-10', [unit2], 80000)).payload.data[0];
    const slip = await h.request(`/api/v1/billing/invoices/${invoice.id}/payment-slip`, {
      cookie,
      raw: true
    });
    assert.equal(slip.status, 200);
    assert.match(slip.payload, /Colilla de pago/);
    assert.match(slip.payload, /Administración 2026-10/);
    assert.match(slip.payload, /Referencia de pago/);
  });

  test('HU-051 / IT-051-02 devuelve 404, 403 y escapa contenido HTML', async () => {
    assert.equal(
      (await h.request('/api/v1/billing/invoices/999999/payment-slip', { cookie, raw: true }))
        .status,
      404
    );
    const invoice = (await ordinary('2026-11', [unit1], 100)).payload.data[0];
    await h.database.query(
      "UPDATE invoice_items SET concept='<script>alert(1)</script>' WHERE invoice_id=?",
      [invoice.id]
    );
    const slip = await h.request(`/api/v1/billing/invoices/${invoice.id}/payment-slip`, {
      cookie,
      raw: true
    });
    assert.doesNotMatch(slip.payload, /<script>/);
    assert.match(slip.payload, /&lt;script&gt;/);
    assert.equal(
      (
        await h.request(`/api/v1/billing/invoices/${invoice.id}/payment-slip`, {
          cookie: operator,
          raw: true
        })
      ).status,
      403
    );
  });
});
