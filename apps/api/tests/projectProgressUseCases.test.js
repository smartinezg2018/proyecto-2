import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectProgressUseCases } from '../src/modules/projects/application/projectProgressUseCases.js';

const validInput = {
  quoteId: 1,
  progressDate: '2026-11-15',
  percentage: 35,
  executedCost: 18200000,
  observations: 'Se completó el desmonte de la cubierta antigua.',
  evidenceRef: 'informe-avance-1.pdf'
};

function setup(projectOverrides = {}) {
  const progressEntries = [];
  const projects = [
    {
      id: 1,
      buildingId: 1,
      name: 'Reparación de cubierta Torre B',
      status: 'aprobado',
      selectedQuoteId: 1,
      ...projectOverrides
    }
  ];
  const quotes = [
    {
      id: 1,
      projectId: 1,
      supplierId: 2,
      supplier: { id: 2, name: 'soluciones verticales' }
    },
    {
      id: 2,
      projectId: 1,
      supplierId: 3,
      supplier: { id: 3, name: 'x' }
    },
    {
      id: 9,
      projectId: 99,
      supplierId: 8,
      supplier: { id: 8, name: 'Otro proveedor' }
    }
  ];
  const buildings = [{ id: 1, name: 'Bucanero 3' }];
  const auditEntries = [];

  const useCases = createProjectProgressUseCases(
    {
      async create(input) {
        const saved = { id: progressEntries.length + 1, ...input };
        progressEntries.push(saved);
        return saved;
      },
      async findByProject(projectId) {
        return progressEntries
          .filter((item) => Number(item.projectId) === Number(projectId))
          .slice()
          .reverse();
      }
    },
    {
      async findById(id) {
        return projects.find((item) => String(item.id) === String(id)) ?? null;
      },
      async updateStatus(id, status, updatedBy) {
        const project = projects.find((item) => String(item.id) === String(id));
        if (!project) return null;
        project.status = status;
        project.updatedBy = updatedBy;
        return project;
      }
    },
    {
      async findById(id) {
        return buildings.find((item) => String(item.id) === String(id)) ?? null;
      }
    },
    {
      async findById(id) {
        return quotes.find((item) => String(item.id) === String(id)) ?? null;
      }
    },
    {
      async record(entry) {
        auditEntries.push(entry);
      }
    }
  );

  return { useCases, progressEntries, projects, auditEntries };
}

test('HU-061: registra porcentaje, fecha, costo ejecutado, observaciones y evidencias', async () => {
  const { useCases, progressEntries } = setup();

  const saved = await useCases.register(1, 1, validInput, 7);

  assert.equal(saved.projectId, 1);
  assert.equal(saved.progressDate, '2026-11-15');
  assert.equal(saved.percentage, 35);
  assert.equal(saved.executedCost, 18200000);
  assert.equal(saved.observations, 'Se completó el desmonte de la cubierta antigua.');
  assert.equal(saved.evidenceRef, 'informe-avance-1.pdf');
  assert.equal(saved.quoteId, 1);
  assert.equal(saved.supplierId, 2);
  assert.equal(saved.supplierName, 'soluciones verticales');
  assert.equal(saved.createdBy, 7);
  assert.equal(progressEntries.length, 1);
});

test('HU-061: conserva el proveedor del avance aunque el proyecto cambie de cotización', async () => {
  const { useCases, progressEntries, projects } = setup();

  await useCases.register(1, 1, validInput, 7);
  projects[0].selectedQuoteId = 2;

  const listed = await useCases.list(1, 1);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].supplierName, 'soluciones verticales');
  assert.equal(listed[0].quoteId, 1);
  assert.equal(progressEntries[0].supplierName, 'soluciones verticales');
});

test('HU-061: rechaza una cotización ajena o sin proveedor', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 1, { ...validInput, quoteId: 9 }), {
    statusCode: 404,
    code: 'QUOTE_NOT_FOUND'
  });
  await assert.rejects(() => useCases.register(1, 1, { ...validInput, quoteId: 0 }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
});

test('HU-061: conserva el historial sin sobrescribir avances anteriores', async () => {
  const { useCases } = setup();

  await useCases.register(1, 1, validInput);
  await useCases.register(1, 1, {
    ...validInput,
    progressDate: '2026-12-01',
    percentage: 62,
    executedCost: 31000000,
    observations: 'Se instaló la nueva impermeabilización en el 60% del área.',
    evidenceRef: 'informe-avance-2.pdf'
  });

  const listed = await useCases.list(1, 1);
  assert.equal(listed.length, 2);
  assert.deepEqual(
    listed.map((item) => item.percentage),
    [62, 35]
  );
});

test('HU-061: el primer avance pasa el proyecto a en ejecución y queda en auditoría', async () => {
  const { useCases, projects, auditEntries } = setup();

  const saved = await useCases.register(1, 1, validInput, 7);

  assert.equal(projects[0].status, 'en_ejecucion');
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].entity, 'project_progress');
  assert.equal(auditEntries[0].entityId, saved.id);
  assert.equal(auditEntries[0].metadata.percentage, 35);
});

test('HU-061: rechaza un porcentaje fuera de rango o con más de dos decimales', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 1, { ...validInput, percentage: 120 }), {
    statusCode: 400,
    message: 'El porcentaje de avance debe estar entre 0 y 100.'
  });
  await assert.rejects(() => useCases.register(1, 1, { ...validInput, percentage: 10.123 }), {
    statusCode: 400,
    message: 'El porcentaje de avance admite como máximo dos decimales.'
  });
});

test('HU-061: rechaza avance en un proyecto cerrado', async () => {
  const { useCases } = setup({ status: 'finalizado' });

  await assert.rejects(() => useCases.register(1, 1, validInput), {
    statusCode: 409,
    code: 'PROJECT_CLOSED'
  });
});

test('HU-061: rechaza observaciones vacías o fecha inválida', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, 1, { ...validInput, observations: '   ' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(
    () => useCases.register(1, 1, { ...validInput, progressDate: '2026-02-31' }),
    { statusCode: 400, code: 'VALIDATION_ERROR' }
  );
});
