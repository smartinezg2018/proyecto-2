import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { createIntegrationHarness } from './helpers/integrationHarness.js';

describe('Integración presupuesto HU-054 a HU-057', { concurrency: false }, async () => {
  const h = await createIntegrationHarness('budget');
  after(() => h.close());
  const cookie = await h.login();
  const operator = await h.login('operador@example.com', 'Operador123!');
  const { buildings } = await h.ids();
  const [building1, building2] = buildings;
  const request = (path, { method = 'GET', body, auth = cookie, raw = false } = {}) =>
    h.request(path, { method, body, cookie: auth, raw });
  const createBudget = async (year, lines, buildingId = building1.id, status = 'borrador') => {
    const response = await request(`/api/v1/budget/buildings/${buildingId}/budgets`, {
      method: 'POST',
      body: { year, status, lines }
    });
    assert.equal(response.status, 201, JSON.stringify(response.payload));
    return response.payload.data;
  };
  const lines = [
    { code: 'ING', name: 'Cuotas', classification: 'ingreso', amount: 300000 },
    { code: 'VIG', name: 'Vigilancia', classification: 'gasto', amount: 100000 },
    { code: 'ASE', name: 'Aseo', classification: 'gasto', amount: 50000 },
    { code: 'CER', name: 'Partida cero', classification: 'gasto', amount: 0 }
  ];

  test('HU-054 / IT-054-01 crea, lista, consulta y aprueba versiones', async () => {
    const first = await createBudget(2030, lines);
    const second = await createBudget(2030, [{ ...lines[0], amount: 310000 }]);
    assert.equal(first.version, 1);
    assert.equal(second.version, 2);
    const listed = await request(`/api/v1/budget/buildings/${building1.id}/budgets?year=2030`);
    assert.equal(listed.payload.data.length, 2);
    const updated = await request(
      `/api/v1/budget/buildings/${building1.id}/budgets/${second.id}/status`,
      { method: 'PATCH', body: { status: 'aprobado' } }
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.payload.data.status, 'aprobado');
  });

  test('HU-054 / IT-054-02 rechaza códigos, estados, permisos y edificio ajeno', async () => {
    const path = `/api/v1/budget/buildings/${building1.id}/budgets`;
    const duplicate = await request(path, {
      method: 'POST',
      body: { year: 2031, lines: [lines[0], { ...lines[0], name: 'Duplicada' }] }
    });
    assert.equal(duplicate.status, 400);
    assert.equal(
      (
        await request(path, {
          method: 'POST',
          body: { year: 2031, status: 'invalido', lines: [lines[0]] }
        })
      ).status,
      400
    );
    assert.equal(
      (
        await request(path, {
          method: 'POST',
          body: { year: 2031, lines: [lines[0]] },
          auth: operator
        })
      ).status,
      403
    );
    const [rows] = await h.database.query(
      'SELECT id FROM annual_budgets WHERE building_id=? AND year=2031',
      [building1.id]
    );
    assert.equal(rows.length, 0);
  });

  test('HU-055 / IT-055-01 registra movimientos y actualiza ejecutado y saldo', async () => {
    const budget = await createBudget(2032, lines, building1.id, 'aprobado');
    const line = budget.lines.find((item) => item.code === 'VIG');
    for (const amount of [25000, 35000]) {
      const response = await request(`/api/v1/budget/buildings/${building1.id}/executions`, {
        method: 'POST',
        body: {
          budgetLineId: line.id,
          executionDate: '2032-06-15',
          amount,
          description: 'Ejecución'
        }
      });
      assert.equal(response.status, 201);
    }
    const listed = await request(`/api/v1/budget/buildings/${building1.id}/budget-lines?year=2032`);
    const updated = listed.payload.data.find((item) => item.code === 'VIG');
    assert.equal(updated.executedAmount, 60000);
    assert.equal(updated.availableAmount, 40000);
  });

  test('HU-055 / IT-055-02 rechaza valor, partida y permiso inválidos', async () => {
    const foreign = await createBudget(2033, [lines[1]], building2.id, 'aprobado');
    const path = `/api/v1/budget/buildings/${building1.id}/executions`;
    const body = {
      budgetLineId: foreign.lines[0].id,
      executionDate: '2033-01-10',
      amount: 100,
      description: 'Ajena'
    };
    assert.equal((await request(path, { method: 'POST', body })).status, 404);
    assert.equal(
      (await request(path, { method: 'POST', body: { ...body, amount: 0 } })).status,
      400
    );
    assert.equal((await request(path, { method: 'POST', body, auth: operator })).status, 403);
  });

  test('HU-056 / IT-056-01 calcula variaciones, totales y alertas', async () => {
    const budget = await createBudget(2034, lines, building1.id, 'aprobado');
    const vig = budget.lines.find((item) => item.code === 'VIG');
    const ase = budget.lines.find((item) => item.code === 'ASE');
    await h.database.query(
      `INSERT INTO budget_executions (budget_line_id, execution_date, amount, description)
       VALUES (?, '2034-06-01', 120000, 'Sobre'), (?, '2034-06-01', 10000, 'Baja')`,
      [vig.id, ase.id]
    );
    const response = await request(
      `/api/v1/budget/buildings/${building1.id}/budget-comparison?year=2034`
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.payload.data.lines.find((item) => item.code === 'VIG').alert,
      'sobreejecucion'
    );
    assert.equal(
      response.payload.data.lines.find((item) => item.code === 'ASE').alert,
      'baja_ejecucion'
    );
    assert.equal(response.payload.data.overExecutedCount, 1);
  });

  test('HU-056 / IT-056-02 controla presupuesto cero, año y aislamiento', async () => {
    const response = await request(
      `/api/v1/budget/buildings/${building1.id}/budget-comparison?year=2034`
    );
    const zero = response.payload.data.lines.find((item) => item.code === 'CER');
    assert.equal(zero.variancePercent, 0);
    assert.equal(
      (await request(`/api/v1/budget/buildings/${building1.id}/budget-comparison?year=no`)).status,
      400
    );
    assert.equal(
      (
        await request(`/api/v1/budget/buildings/${building2.id}/budget-comparison?year=2034`, {
          auth: operator
        })
      ).status,
      403
    );
  });

  test('HU-057 / IT-057-01 filtra reporte JSON por vigencia, periodo y partida', async () => {
    const budget = await createBudget(2035, lines, building1.id, 'aprobado');
    const vig = budget.lines.find((item) => item.code === 'VIG');
    await h.database.query(
      `INSERT INTO budget_executions (budget_line_id, execution_date, amount, description)
       VALUES (?, '2035-02-01', 10000, 'Febrero'), (?, '2035-09-01', 20000, 'Septiembre')`,
      [vig.id, vig.id]
    );
    const response = await request(
      `/api/v1/budget/buildings/${building1.id}/budget-report?year=2035&fromDate=2035-01-01&toDate=2035-06-30&lineCode=vig`
    );
    assert.equal(response.status, 200);
    assert.equal(response.payload.data.lines.length, 1);
    assert.equal(response.payload.data.totalExecuted, 10000);
  });

  test('HU-057 / IT-057-02 descarga CSV y rechaza filtros o acceso inválidos', async () => {
    const csv = await request(
      `/api/v1/budget/buildings/${building1.id}/budget-report?year=2035&format=csv`,
      { raw: true }
    );
    assert.equal(csv.status, 200);
    assert.match(csv.payload, /^codigo,partida,clasificacion,presupuestado,ejecutado,disponible/m);
    assert.equal(
      (
        await request(
          `/api/v1/budget/buildings/${building1.id}/budget-report?year=2035&fromDate=2035-12-31&toDate=2035-01-01`
        )
      ).status,
      400
    );
    assert.equal(
      (
        await request(`/api/v1/budget/buildings/${building2.id}/budget-report?year=2035`, {
          auth: operator
        })
      ).status,
      403
    );
  });
});
