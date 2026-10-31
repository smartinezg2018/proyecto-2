import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectQuoteUseCases } from '../src/modules/projects/application/projectQuoteUseCases.js';

const validInput = {
  supplierId: 2,
  amount: 58500000,
  validUntil: '2026-11-30',
  scope: 'Impermeabilización completa de la cubierta, incluyendo desmonte y pruebas de estanqueidad.',
  documentRef: 'cotizacion-cubierta.pdf'
};

function setup() {
  const quotes = [];
  const projects = [{ id: 1, buildingId: 1, name: 'Reparación de cubierta Torre B' }];
  const buildings = [{ id: 1, name: 'Bucanero 3' }];
  const suppliers = [{ id: 2, name: 'Cubiertas del Norte', identification: '900222333' }];
  const auditEntries = [];

  const useCases = createProjectQuoteUseCases(
    {
      async create(input) {
        const saved = { id: quotes.length + 1, ...input };
        quotes.push(saved);
        return saved;
      },
      async findByProject(projectId) {
        return quotes.filter((item) => Number(item.projectId) === Number(projectId));
      }
    },
    {
      async findById(id) {
        return projects.find((item) => String(item.id) === String(id)) ?? null;
      }
    },
    {
      async findById(id) {
        return buildings.find((item) => String(item.id) === String(id)) ?? null;
      }
    },
    {
      async findById(id) {
        return suppliers.find((item) => String(item.id) === String(id)) ?? null;
      }
    },
    {
      async record(entry) {
        auditEntries.push(entry);
      }
    }
  );

  return { useCases, quotes, auditEntries };
}

test('HU-059: registra una cotización con proveedor, valor, vigencia, alcance y documento', async () => {
  const { useCases, quotes } = setup();

  const saved = await useCases.register(1, 1, validInput, 7);

  assert.equal(saved.projectId, 1);
  assert.equal(saved.supplierId, 2);
  assert.equal(saved.amount, 58500000);
  assert.equal(saved.validUntil, '2026-11-30');
  assert.equal(
    saved.scope,
    'Impermeabilización completa de la cubierta, incluyendo desmonte y pruebas de estanqueidad.'
  );
  assert.equal(saved.documentRef, 'cotizacion-cubierta.pdf');
  assert.equal(saved.createdBy, 7);
  assert.equal(quotes.length, 1);
});

test('HU-059: relaciona varias cotizaciones con el mismo proyecto', async () => {
  const { useCases } = setup();

  await useCases.register(1, 1, { ...validInput, amount: 58500000, documentRef: 'a.pdf' });
  await useCases.register(1, 1, { ...validInput, amount: 61200000, documentRef: 'b.pdf' });
  await useCases.register(1, 1, { ...validInput, amount: 54800000, documentRef: 'c.pdf' });

  const listed = await useCases.list(1, 1);
  assert.equal(listed.length, 3);
  assert.deepEqual(
    listed.map((item) => item.amount),
    [58500000, 61200000, 54800000]
  );
});

test('HU-059: registra auditoría al crear la cotización', async () => {
  const { useCases, auditEntries } = setup();

  const saved = await useCases.register(1, 1, validInput, 7);

  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].action, 'create');
  assert.equal(auditEntries[0].module, 'projects');
  assert.equal(auditEntries[0].entity, 'project_quote');
  assert.equal(auditEntries[0].entityId, saved.id);
  assert.equal(auditEntries[0].buildingId, 1);
  assert.equal(auditEntries[0].metadata.projectId, 1);
  assert.equal(auditEntries[0].metadata.amount, 58500000);
});

test('HU-059: rechaza un proyecto que no pertenece al edificio', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 99, validInput, 7), {
    statusCode: 404,
    code: 'PROJECT_NOT_FOUND'
  });
});

test('HU-059: rechaza un proveedor inexistente', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 1, { ...validInput, supplierId: 9 }, 7), {
    statusCode: 404,
    code: 'SUPPLIER_NOT_FOUND'
  });
});

test('HU-059: rechaza valor negativo, decimales inválidos o vigencia inválida', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 1, { ...validInput, amount: -1 }), {
    statusCode: 400,
    message: 'El valor de la cotización no puede ser negativo.'
  });
  await assert.rejects(() => useCases.register(1, 1, { ...validInput, amount: 10.123 }), {
    statusCode: 400,
    message: 'El valor de la cotización admite como máximo dos decimales.'
  });
  await assert.rejects(() => useCases.register(1, 1, { ...validInput, validUntil: '2026-02-31' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('HU-059: rechaza alcance vacío', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 1, { ...validInput, scope: '   ' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});
