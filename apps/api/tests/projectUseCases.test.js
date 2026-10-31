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
      async findByBuilding(buildingId) {
        return projects
          .filter((item) => String(item.buildingId) === String(buildingId))
          .sort((left, right) => String(right.startDate).localeCompare(left.startDate));
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
