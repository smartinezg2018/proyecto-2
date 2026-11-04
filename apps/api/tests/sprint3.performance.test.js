import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { after, describe, test } from 'node:test';
import { createIntegrationHarness } from './helpers/integrationHarness.js';

const LIMIT_MS = 5000;

describe('Performance básica HU-040 a HU-063', { concurrency: false }, async () => {
  const h = await createIntegrationHarness('performance');
  after(() => h.close());
  const cookie = await h.login();
  const { buildings } = await h.ids();
  const buildingId = buildings[0].id;

  async function measured(path) {
    await h.request(path, { cookie });
    const start = performance.now();
    const response = await h.request(path, { cookie });
    return { response, elapsed: performance.now() - start };
  }

  test(
    'PF-BILLING-01 consulta cartera de 1.000 apartamentos en menos de 5 segundos',
    { timeout: 120000 },
    async () => {
      const units = Array.from({ length: 1000 }, (_, index) => [
        buildingId,
        `PF-${index + 1}`,
        'P',
        'apartamento',
        1,
        'ocupado'
      ]);
      const [unitInsert] = await h.database.query(
        'INSERT INTO units (building_id,number,tower,kind,coefficient,status) VALUES ?',
        [units]
      );
      const invoices = Array.from({ length: 1000 }, (_, index) => [
        buildingId,
        unitInsert.insertId + index,
        '2038-01',
        '2038-01-20',
        'pendiente',
        `PF-${index + 1}`,
        100000
      ]);
      const [invoiceInsert] = await h.database.query(
        'INSERT INTO invoices (building_id,unit_id,period,due_date,status,payment_reference,total) VALUES ?',
        [invoices]
      );
      const items = Array.from({ length: 1000 }, (_, index) => [
        invoiceInsert.insertId + index,
        'Administración',
        'capital',
        100000
      ]);
      await h.database.query(
        'INSERT INTO invoice_items (invoice_id,concept,item_type,amount) VALUES ?',
        [items]
      );
      const { response, elapsed } = await measured(
        `/api/v1/billing/buildings/${buildingId}/portfolio?period=2038-01`
      );
      assert.equal(response.status, 200);
      assert.equal(response.payload.data.length, 1000);
      assert.ok(elapsed < LIMIT_MS, `La cartera tardó ${elapsed.toFixed(2)} ms`);
    }
  );

  test(
    'PF-BUDGET-01 genera reporte de 500 partidas y 5.000 ejecuciones en menos de 5 segundos',
    { timeout: 120000 },
    async () => {
      const [budget] = await h.database.query(
        "INSERT INTO annual_budgets (building_id,year,version,status) VALUES (?,2038,1,'aprobado')",
        [buildingId]
      );
      const lines = Array.from({ length: 500 }, (_, index) => [
        budget.insertId,
        `PF-${index + 1}`,
        `Partida ${index + 1}`,
        index % 2 ? 'gasto' : 'ingreso',
        100000
      ]);
      const [lineInsert] = await h.database.query(
        'INSERT INTO budget_lines (budget_id,code,name,classification,amount) VALUES ?',
        [lines]
      );
      const executions = [];
      for (let index = 0; index < 500; index += 1) {
        for (let month = 1; month <= 10; month += 1)
          executions.push([
            lineInsert.insertId + index,
            `2038-${String(month).padStart(2, '0')}-01`,
            1000,
            'Carga'
          ]);
      }
      await h.database.query(
        'INSERT INTO budget_executions (budget_line_id,execution_date,amount,description) VALUES ?',
        [executions]
      );
      const { response, elapsed } = await measured(
        `/api/v1/budget/buildings/${buildingId}/budget-report?year=2038`
      );
      assert.equal(response.status, 200);
      assert.equal(response.payload.data.lines.length, 500);
      assert.equal(response.payload.data.executions.length, 5000);
      assert.ok(elapsed < LIMIT_MS, `El reporte tardó ${elapsed.toFixed(2)} ms`);
    }
  );

  test(
    'PF-PROJECTS-01 filtra 1.000 proyectos en menos de 5 segundos',
    { timeout: 120000 },
    async () => {
      const projects = Array.from({ length: 1000 }, (_, index) => [
        buildingId,
        `Proyecto PF ${index + 1}`,
        'Objetivo',
        index % 2 ? 'mejora' : 'obra',
        100000,
        '2038-01-01',
        '2038-12-31',
        'Responsable',
        `ACTA-${index + 1}`,
        'aprobado'
      ]);
      await h.database.query(
        'INSERT INTO projects (building_id,name,objective,project_type,budget,start_date,end_date,responsible,approval_reference,status) VALUES ?',
        [projects]
      );
      const { response, elapsed } = await measured(
        `/api/v1/projects/buildings/${buildingId}/projects?status=aprobado&dateFrom=2038-01-01&dateTo=2038-12-31`
      );
      assert.equal(response.status, 200);
      assert.equal(response.payload.data.length, 1000);
      assert.ok(elapsed < LIMIT_MS, `El historial tardó ${elapsed.toFixed(2)} ms`);
    }
  );
});
