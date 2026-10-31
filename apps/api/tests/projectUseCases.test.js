import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectUseCases } from '../src/modules/projects/application/projectUseCases.js';

const validInput = {
  name: 'Reparación de cubierta Torre B',
  objective: 'Reemplazar la impermeabilización de la cubierta.',
  projectType: 'obra',
  budget: 61000000,
  startDate: '2026-11-01',
  endDate: '2027-01-30',
  responsible: '  Ana Martínez  ',
  approvalReference: 'Acta asamblea 12/10/2026'
};

function setup() {
  const projects = [];
  const buildings = [{ id: 1, name: 'Bucanero 3' }];
  const auditEntries = [];

  const useCases = createProjectUseCases(
    {
      async create(project) {
        const saved = { id: projects.length + 1, ...project };
        projects.push(saved);
        return saved;
      },
      async findById(id) {
        return projects.find((item) => String(item.id) === String(id)) ?? null;
      },
      async findByBuilding(buildingId, filters = {}) {
        return projects
          .filter((item) => String(item.buildingId) === String(buildingId))
          .filter((item) => !filters.status || item.status === filters.status)
          .filter((item) => !filters.projectType || item.projectType === filters.projectType)
          .filter((item) => !filters.dateFrom || item.startDate >= filters.dateFrom)
          .filter((item) => !filters.dateTo || item.startDate <= filters.dateTo)
          .sort((left, right) => String(right.startDate).localeCompare(left.startDate));
      },
      async close(id, closure) {
        const project = projects.find((item) => String(item.id) === String(id));
        if (!project) return null;
        Object.assign(project, {
          status: 'finalizado',
          closeDate: closure.closeDate,
          totalCost: closure.totalCost,
          result: closure.result,
          closingDocumentRef: closure.closingDocumentRef,
          updatedBy: closure.updatedBy
        });
        return project;
      }
    },
    {
      async findById(id) {
        return buildings.find((item) => String(item.id) === String(id)) ?? null;
      }
    },
    {
      async record(entry) {
        auditEntries.push(entry);
      }
    }
  );

  return { useCases, projects, auditEntries };
}

test('HU-058: registra un proyecto con edificio, objetivo, presupuesto, fechas y responsable', async () => {
  const { useCases, projects } = setup();

  const saved = await useCases.register(1, validInput, 7);

  assert.equal(saved.buildingId, 1);
  assert.equal(saved.name, 'Reparación de cubierta Torre B');
  assert.equal(saved.objective, 'Reemplazar la impermeabilización de la cubierta.');
  assert.equal(saved.projectType, 'obra');
  assert.equal(saved.budget, 61000000);
  assert.equal(saved.startDate, '2026-11-01');
  assert.equal(saved.endDate, '2027-01-30');
  assert.equal(saved.responsible, 'Ana Martínez');
  assert.equal(saved.approvalReference, 'Acta asamblea 12/10/2026');
  assert.equal(saved.status, 'aprobado');
  assert.equal(saved.createdBy, 7);
  assert.equal(projects.length, 1);
});

test('HU-058: inicia en aprobado y registra auditoría', async () => {
  const { useCases, auditEntries } = setup();

  const saved = await useCases.register(1, validInput, 7);

  assert.equal(saved.status, 'aprobado');
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].action, 'create');
  assert.equal(auditEntries[0].module, 'projects');
  assert.equal(auditEntries[0].entity, 'project');
  assert.equal(auditEntries[0].entityId, saved.id);
  assert.equal(auditEntries[0].buildingId, 1);
  assert.equal(auditEntries[0].metadata.approvalReference, 'Acta asamblea 12/10/2026');
});

test('HU-058: lista los proyectos del edificio', async () => {
  const { useCases } = setup();
  await useCases.register(1, { ...validInput, name: 'Proyecto A', startDate: '2026-01-01' });
  await useCases.register(1, { ...validInput, name: 'Proyecto B', startDate: '2026-06-01' });

  const listed = await useCases.listByBuilding(1);
  assert.deepEqual(
    listed.map((item) => item.name),
    ['Proyecto B', 'Proyecto A']
  );
});

test('HU-058: rechaza un edificio inexistente', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(99, validInput, 7), {
    statusCode: 404,
    code: 'BUILDING_NOT_FOUND'
  });
});

test('HU-058: rechaza nombre, objetivo, responsable o aprobación vacíos', async () => {
  const { useCases } = setup();

  for (const field of ['name', 'objective', 'responsible', 'approvalReference']) {
    await assert.rejects(() => useCases.register(1, { ...validInput, [field]: '   ' }), {
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    });
  }
});

test('HU-058: rechaza un tipo de proyecto inválido', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...validInput, projectType: 'otro-tipo' }), {
    statusCode: 400,
    message: 'El tipo de proyecto debe ser obra, mejora, mantenimiento u otro.'
  });
});

test('HU-058: rechaza un presupuesto negativo o con más de dos decimales', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...validInput, budget: -1 }), {
    statusCode: 400,
    message: 'El presupuesto no puede ser negativo.'
  });
  await assert.rejects(() => useCases.register(1, { ...validInput, budget: 10.123 }), {
    statusCode: 400,
    message: 'El presupuesto admite como máximo dos decimales.'
  });
});

test('HU-058: rechaza fechas inválidas o invertidas', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.register(1, { ...validInput, startDate: '2026-02-31' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(
    () => useCases.register(1, { ...validInput, startDate: '2027-02-01', endDate: '2027-01-01' }),
    {
      statusCode: 400,
      message: 'La fecha de fin no puede ser anterior a la fecha de inicio.'
    }
  );
});

test('HU-062: filtra el historial por estado, tipo y fecha de inicio', async () => {
  const { useCases, projects } = setup();
  await useCases.register(1, {
    ...validInput,
    name: 'Cubierta',
    projectType: 'obra',
    startDate: '2026-01-10'
  });
  await useCases.register(1, {
    ...validInput,
    name: 'Mejora de iluminación',
    projectType: 'mejora',
    startDate: '2026-06-15',
    endDate: '2026-08-15'
  });
  projects[0].status = 'finalizado';

  const byStatus = await useCases.listByBuilding(1, { status: 'finalizado' });
  assert.deepEqual(
    byStatus.map((item) => item.name),
    ['Cubierta']
  );

  const byType = await useCases.listByBuilding(1, { projectType: 'mejora' });
  assert.deepEqual(
    byType.map((item) => item.name),
    ['Mejora de iluminación']
  );

  const byDate = await useCases.listByBuilding(1, {
    dateFrom: '2026-06-01',
    dateTo: '2026-12-31'
  });
  assert.deepEqual(
    byDate.map((item) => item.name),
    ['Mejora de iluminación']
  );
});

test('HU-062: rechaza un estado, tipo o rango de fechas inválido', async () => {
  const { useCases } = setup();

  await assert.rejects(() => useCases.listByBuilding(1, { status: 'otro' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(() => useCases.listByBuilding(1, { projectType: 'remodelacion' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(
    () => useCases.listByBuilding(1, { dateFrom: '2026-12-01', dateTo: '2026-01-01' }),
    { statusCode: 400, code: 'VALIDATION_ERROR' }
  );
});

test('HU-063: cierra el proyecto con fecha, costo, resultado y documento', async () => {
  const { useCases, projects, auditEntries } = setup();
  const saved = await useCases.register(1, validInput, 7);

  const closed = await useCases.close(
    1,
    saved.id,
    {
      closeDate: '2027-01-28',
      totalCost: 57200000,
      result: 'Se restableció la impermeabilización de la cubierta.',
      closingDocumentRef: 'acta-cierre-cubierta.pdf'
    },
    7
  );

  assert.equal(closed.status, 'finalizado');
  assert.equal(closed.closeDate, '2027-01-28');
  assert.equal(closed.totalCost, 57200000);
  assert.equal(closed.result, 'Se restableció la impermeabilización de la cubierta.');
  assert.equal(closed.closingDocumentRef, 'acta-cierre-cubierta.pdf');
  assert.equal(projects[0].status, 'finalizado');
  assert.equal(auditEntries.at(-1).action, 'update');
  assert.equal(auditEntries.at(-1).metadata.status, 'finalizado');
});

test('HU-063: conserva el cierre para consulta y rechaza un proyecto ya cerrado', async () => {
  const { useCases } = setup();
  const saved = await useCases.register(1, validInput, 7);
  await useCases.close(1, saved.id, {
    closeDate: '2027-01-28',
    totalCost: 57200000,
    result: 'Obra entregada.',
    closingDocumentRef: null
  });

  const listed = await useCases.listByBuilding(1, { status: 'finalizado' });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].result, 'Obra entregada.');
  assert.equal(listed[0].status, 'finalizado');

  await assert.rejects(
    () =>
      useCases.close(1, saved.id, {
        closeDate: '2027-02-01',
        totalCost: 1,
        result: 'Segundo cierre'
      }),
    { statusCode: 409, code: 'PROJECT_CLOSED' }
  );
});

test('HU-063: rechaza resultado vacío, costo inválido o fecha anterior al inicio', async () => {
  const { useCases } = setup();
  const saved = await useCases.register(1, validInput, 7);
  const validClose = {
    closeDate: '2027-01-28',
    totalCost: 57200000,
    result: 'Obra entregada.'
  };

  await assert.rejects(() => useCases.close(1, saved.id, { ...validClose, result: '   ' }), {
    statusCode: 400,
    code: 'VALIDATION_ERROR'
  });
  await assert.rejects(() => useCases.close(1, saved.id, { ...validClose, totalCost: -10 }), {
    statusCode: 400,
    message: 'El costo total no puede ser negativo.'
  });
  await assert.rejects(
    () => useCases.close(1, saved.id, { ...validClose, closeDate: '2026-10-01' }),
    {
      statusCode: 400,
      message: 'La fecha de cierre no puede ser anterior a la fecha de inicio.'
    }
  );
});
