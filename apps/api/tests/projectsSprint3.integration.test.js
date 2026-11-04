import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { createIntegrationHarness } from './helpers/integrationHarness.js';

describe('Integración proyectos HU-058 a HU-063', { concurrency: false }, async () => {
  const h = await createIntegrationHarness('projects');
  after(() => h.close());
  const cookie = await h.login();
  const operator = await h.login('operador@example.com', 'Operador123!');
  const { buildings } = await h.ids();
  const [building1, building2] = buildings;
  const [supplierResult] = await h.database.query(
    `INSERT INTO suppliers (identification, name, phone, email)
     VALUES ('SUP-T-1','Proveedor Uno','3001','uno@test.local'),
            ('SUP-T-2','Proveedor Dos','3002','dos@test.local')`
  );
  const supplier1 = supplierResult.insertId;
  const supplier2 = supplier1 + 1;
  const request = (path, { method = 'GET', body, auth = cookie } = {}) =>
    h.request(path, { method, body, cookie: auth });
  const projectInput = (name = 'Proyecto prueba') => ({
    name,
    objective: 'Mejorar zonas comunes',
    projectType: 'mejora',
    budget: 200000,
    startDate: '2030-01-10',
    endDate: '2030-12-10',
    responsible: 'Responsable',
    approvalReference: 'ACTA-2030'
  });
  const createProject = async (name, buildingId = building1.id) => {
    const response = await request(`/api/v1/projects/buildings/${buildingId}/projects`, {
      method: 'POST',
      body: projectInput(name)
    });
    assert.equal(response.status, 201, JSON.stringify(response.payload));
    return response.payload.data;
  };
  const quoteInput = (supplierId, amount = 100000) => ({
    supplierId,
    amount,
    validUntil: '2030-12-31',
    scope: 'Alcance completo',
    conditions: 'Pago contra entrega',
    deliveryDays: 30,
    documentRef: `cot-${supplierId}.pdf`
  });
  const createQuote = async (projectId, supplierId, amount) => {
    const response = await request(
      `/api/v1/projects/buildings/${building1.id}/projects/${projectId}/quotes`,
      {
        method: 'POST',
        body: quoteInput(supplierId, amount)
      }
    );
    assert.equal(response.status, 201, JSON.stringify(response.payload));
    return response.payload.data;
  };

  test('HU-058 / IT-058-01 registra, lista y audita un proyecto aprobado', async () => {
    const project = await createProject('Proyecto 058');
    assert.equal(project.status, 'aprobado');
    const listed = await request(
      `/api/v1/projects/buildings/${building1.id}/projects?projectType=mejora`
    );
    assert.ok(listed.payload.data.some((item) => item.id === project.id));
    const [audit] = await h.database.query(
      "SELECT id FROM audit_logs WHERE entity='project' AND entity_id=?",
      [project.id]
    );
    assert.equal(audit.length, 1);
  });

  test('HU-058 / IT-058-02 rechaza datos, permisos y edificio no autorizado', async () => {
    const path = `/api/v1/projects/buildings/${building1.id}/projects`;
    assert.equal(
      (await request(path, { method: 'POST', body: { ...projectInput(), name: '' } })).status,
      400
    );
    assert.equal(
      (await request(path, { method: 'POST', body: projectInput(), auth: operator })).status,
      403
    );
    assert.equal(
      (await request(`/api/v1/projects/buildings/${building2.id}/projects`, { auth: operator }))
        .status,
      403
    );
  });

  test('HU-059 / IT-059-01 registra y lista varias cotizaciones con proveedor', async () => {
    const project = await createProject('Proyecto 059');
    await createQuote(project.id, supplier1, 120000);
    await createQuote(project.id, supplier2, 110000);
    const listed = await request(
      `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/quotes`
    );
    assert.equal(listed.status, 200);
    assert.equal(listed.payload.data.length, 2);
    assert.equal(listed.payload.data[0].documentRef.endsWith('.pdf'), true);
  });

  test('HU-059 / IT-059-02 rechaza proyecto, proveedor y valores inválidos', async () => {
    const foreign = await createProject('Proyecto ajeno', building2.id);
    const path = `/api/v1/projects/buildings/${building1.id}/projects/${foreign.id}/quotes`;
    assert.equal(
      (await request(path, { method: 'POST', body: quoteInput(supplier1) })).status,
      404
    );
    const local = await createProject('Proyecto validación 059');
    const localPath = `/api/v1/projects/buildings/${building1.id}/projects/${local.id}/quotes`;
    assert.equal(
      (await request(localPath, { method: 'POST', body: quoteInput(999999) })).status,
      404
    );
    assert.equal(
      (await request(localPath, { method: 'POST', body: quoteInput(supplier1, -1) })).status,
      400
    );
  });

  test('HU-060 / IT-060-01 compara y selecciona una cotización justificadamente', async () => {
    const project = await createProject('Proyecto 060');
    await createQuote(project.id, supplier1, 130000);
    const selected = await createQuote(project.id, supplier2, 115000);
    const response = await request(
      `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/quotes/selection`,
      {
        method: 'POST',
        body: { quoteId: selected.id, justification: 'Mejor precio y plazo' }
      }
    );
    assert.equal(response.status, 200);
    assert.equal(response.payload.data.selectedQuoteId, selected.id);
    assert.equal(response.payload.data.selectionJustification, 'Mejor precio y plazo');
  });

  test('HU-060 / IT-060-02 rechaza selección insuficiente, ajena o sin permiso', async () => {
    const project = await createProject('Proyecto inválido 060');
    const only = await createQuote(project.id, supplier1, 100000);
    const path = `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/quotes/selection`;
    assert.equal(
      (await request(path, { method: 'POST', body: { quoteId: only.id, justification: 'Única' } }))
        .status,
      400
    );
    assert.equal(
      (
        await request(path, {
          method: 'POST',
          body: { quoteId: only.id, justification: 'No autorizado' },
          auth: operator
        })
      ).status,
      403
    );
  });

  test('HU-061 / IT-061-01 registra avances, proveedor e historial sin sobrescribir', async () => {
    const project = await createProject('Proyecto 061');
    const quote = await createQuote(project.id, supplier1, 150000);
    const path = `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/progress`;
    for (const [percentage, date] of [
      [25, '2030-03-01'],
      [60, '2030-06-01']
    ]) {
      const response = await request(path, {
        method: 'POST',
        body: {
          quoteId: quote.id,
          progressDate: date,
          percentage,
          executedCost: percentage * 1000,
          observations: `Avance ${percentage}`,
          evidenceRef: `e-${percentage}.pdf`
        }
      });
      assert.equal(response.status, 201);
    }
    const listed = await request(path);
    assert.equal(listed.payload.data.length, 2);
    assert.ok(listed.payload.data.every((item) => item.supplierName === 'Proveedor Uno'));
    const [rows] = await h.database.query('SELECT status FROM projects WHERE id=?', [project.id]);
    assert.equal(rows[0].status, 'en_ejecucion');
  });

  test('HU-061 / IT-061-02 rechaza proyecto cerrado, cotización ajena y porcentaje inválido', async () => {
    const project = await createProject('Proyecto inválido 061');
    const other = await createProject('Otro proyecto 061');
    const quote = await createQuote(other.id, supplier1, 100000);
    const path = `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/progress`;
    const body = {
      quoteId: quote.id,
      progressDate: '2030-04-01',
      percentage: 30,
      executedCost: 100,
      observations: 'Prueba'
    };
    assert.equal((await request(path, { method: 'POST', body })).status, 404);
    assert.equal(
      (await request(path, { method: 'POST', body: { ...body, percentage: 101 } })).status,
      400
    );
    await h.database.query("UPDATE projects SET status='finalizado' WHERE id=?", [project.id]);
    assert.equal(
      (await request(path, { method: 'POST', body: { ...body, quoteId: quote.id } })).status,
      409
    );
  });

  test('HU-062 / IT-062-01 filtra historial y muestra cotizaciones, avances y cierre', async () => {
    const project = await createProject('Proyecto 062');
    const quote = await createQuote(project.id, supplier1, 90000);
    await request(`/api/v1/projects/buildings/${building1.id}/projects/${project.id}/progress`, {
      method: 'POST',
      body: {
        quoteId: quote.id,
        progressDate: '2030-05-01',
        percentage: 100,
        executedCost: 85000,
        observations: 'Terminado'
      }
    });
    await request(`/api/v1/projects/buildings/${building1.id}/projects/${project.id}/close`, {
      method: 'POST',
      body: {
        closeDate: '2030-06-01',
        totalCost: 85000,
        result: 'Finalizado correctamente',
        closingDocumentRef: 'cierre.pdf'
      }
    });
    const listed = await request(
      `/api/v1/projects/buildings/${building1.id}/projects?status=finalizado&projectType=mejora&dateFrom=2030-01-01&dateTo=2030-12-31`
    );
    const found = listed.payload.data.find((item) => item.id === project.id);
    assert.equal(found.quotes.length, 1);
    assert.equal(found.progressEntries.length, 1);
    assert.equal(found.totalCost, 85000);
  });

  test('HU-062 / IT-062-02 rechaza filtros y acceso de otro edificio', async () => {
    assert.equal(
      (await request(`/api/v1/projects/buildings/${building1.id}/projects?status=desconocido`))
        .status,
      400
    );
    assert.equal(
      (
        await request(
          `/api/v1/projects/buildings/${building1.id}/projects?dateFrom=2030-12-31&dateTo=2030-01-01`
        )
      ).status,
      400
    );
    assert.equal(
      (await request(`/api/v1/projects/buildings/${building2.id}/projects`, { auth: operator }))
        .status,
      403
    );
  });

  test('HU-063 / IT-063-01 cierra el proyecto y conserva estado, costo, resultado y auditoría', async () => {
    const project = await createProject('Proyecto 063');
    const response = await request(
      `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/close`,
      {
        method: 'POST',
        body: {
          closeDate: '2030-10-01',
          totalCost: 190000,
          result: 'Objetivo cumplido',
          closingDocumentRef: 'acta-cierre.pdf'
        }
      }
    );
    assert.equal(response.status, 200);
    assert.equal(response.payload.data.status, 'finalizado');
    assert.equal(response.payload.data.totalCost, 190000);
    const [audit] = await h.database.query(
      "SELECT id FROM audit_logs WHERE entity='project' AND entity_id=? AND action='update'",
      [project.id]
    );
    assert.equal(audit.length, 1);
  });

  test('HU-063 / IT-063-02 rechaza segundo cierre o datos inválidos sin sobrescribir', async () => {
    const project = await createProject('Proyecto inválido 063');
    const path = `/api/v1/projects/buildings/${building1.id}/projects/${project.id}/close`;
    assert.equal(
      (
        await request(path, {
          method: 'POST',
          body: { closeDate: '2029-01-01', totalCost: -1, result: '' }
        })
      ).status,
      400
    );
    const valid = { closeDate: '2030-11-01', totalCost: 180000, result: 'Cierre válido' };
    assert.equal((await request(path, { method: 'POST', body: valid })).status, 200);
    assert.equal(
      (await request(path, { method: 'POST', body: { ...valid, result: 'Sobrescrito' } })).status,
      409
    );
    const [rows] = await h.database.query('SELECT result FROM projects WHERE id=?', [project.id]);
    assert.equal(rows[0].result, 'Cierre válido');
  });
});
