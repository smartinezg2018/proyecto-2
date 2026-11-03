import test from 'node:test';
import assert from 'node:assert/strict';
import { createBudgetUseCases } from '../src/modules/budget/application/budgetUseCases.js';

const SOURCE_LINES = [
  {
    sourceLineId: 10,
    code: 'ASE',
    name: 'Aseo',
    classification: 'gasto',
    budgetedAmount: 45000000,
    executedAmount: 43000000
  },
  {
    sourceLineId: 11,
    code: 'CUO',
    name: 'Cuotas ordinarias',
    classification: 'ingreso',
    budgetedAmount: 280000000,
    executedAmount: 275000000
  }
];

test('HU-052 / CP-052-01: resume ejecución anterior por partida', async () => {
  const useCases = createBudgetUseCases({
    async findExecutionSummary(buildingId, year) {
      assert.equal(buildingId, 4);
      assert.equal(year, 2025);
      return SOURCE_LINES;
    }
  });

  const summary = await useCases.getPreviousExecution(4, 2025);
  assert.equal(summary.totalBudgeted, 325000000);
  assert.equal(summary.totalExecuted, 318000000);
  assert.equal(summary.lines[1].classification, 'ingreso');
});

test('HU-052 / CP-052-02: crea el borrador con bases editadas y metadatos originales', async () => {
  let created;
  const useCases = createBudgetUseCases({
    async findExecutionSummary() {
      return SOURCE_LINES;
    },
    async findDraftByBuildingYear() {
      return null;
    },
    async createDraftFromExecution(input) {
      created = input;
      return { id: 20, year: input.targetYear, status: 'borrador', lines: input.lines };
    }
  });

  const budget = await useCases.createFromExecution(
    4,
    {
      sourceYear: 2025,
      targetYear: 2026,
      lines: [
        { sourceLineId: 10, amount: 44000000 },
        { sourceLineId: 11, amount: 276000000 }
      ]
    },
    7
  );

  assert.equal(budget.status, 'borrador');
  assert.equal(created.createdBy, 7);
  assert.deepEqual(created.lines, [
    { code: 'ASE', name: 'Aseo', classification: 'gasto', amount: 44000000 },
    {
      code: 'CUO',
      name: 'Cuotas ordinarias',
      classification: 'ingreso',
      amount: 276000000
    }
  ]);
});

test('HU-052 rechaza años no consecutivos, partidas repetidas y borrador existente', async () => {
  const repository = {
    async findExecutionSummary() {
      return SOURCE_LINES;
    },
    async findDraftByBuildingYear() {
      return { id: 30 };
    }
  };
  const useCases = createBudgetUseCases(repository);

  await assert.rejects(
    () =>
      useCases.createFromExecution(4, {
        sourceYear: 2025,
        targetYear: 2027,
        lines: []
      }),
    { code: 'INVALID_BUDGET_PERIOD', statusCode: 400 }
  );
  await assert.rejects(
    () =>
      useCases.createFromExecution(4, {
        sourceYear: 2025,
        targetYear: 2026,
        lines: [
          { sourceLineId: 10, amount: 1 },
          { sourceLineId: 10, amount: 2 }
        ]
      }),
    { code: 'DUPLICATE_BUDGET_LINES', statusCode: 400 }
  );
  await assert.rejects(
    () =>
      useCases.createFromExecution(4, {
        sourceYear: 2025,
        targetYear: 2026,
        lines: [
          { sourceLineId: 10, amount: 1 },
          { sourceLineId: 11, amount: 2 }
        ]
      }),
    { code: 'BUDGET_ALREADY_EXISTS', statusCode: 409 }
  );
});

test('HU-054 / CP-054-01: registra presupuesto anual con partidas e ingreso/gasto', async () => {
  let created;
  const useCases = createBudgetUseCases({
    async nextVersionForBuildingYear(buildingId, year) {
      assert.equal(buildingId, 4);
      assert.equal(year, 2026);
      return 1;
    },
    async createAnnualBudget(input) {
      created = input;
      return { id: 40, ...input, lines: input.lines.map((line, index) => ({ id: index + 1, ...line })) };
    }
  });

  const budget = await useCases.registerAnnualBudget(
    4,
    {
      year: 2026,
      status: 'borrador',
      lines: [
        { code: 'ase', name: 'Aseo', classification: 'gasto', amount: 45000000 },
        { code: 'cuo', name: 'Cuotas', classification: 'ingreso', amount: 280000000.5 }
      ]
    },
    9
  );

  assert.equal(budget.status, 'borrador');
  assert.equal(created.version, 1);
  assert.equal(created.createdBy, 9);
  assert.deepEqual(created.lines[0], {
    code: 'ASE',
    name: 'Aseo',
    classification: 'gasto',
    amount: 45000000
  });
  assert.equal(created.lines[1].amount, 280000000.5);
});

test('HU-054 / CP-054-02: maneja versiones y estado de aprobación', async () => {
  const useCases = createBudgetUseCases({
    async nextVersionForBuildingYear() {
      return 3;
    },
    async createAnnualBudget(input) {
      return { id: 41, ...input };
    },
    async findAnnualBudgetById(budgetId) {
      assert.equal(budgetId, 41);
      return { id: 41, buildingId: 4, year: 2026, version: 3, status: 'borrador', lines: [] };
    },
    async updateAnnualBudgetStatus(budgetId, status, updatedBy) {
      return { id: budgetId, buildingId: 4, year: 2026, version: 3, status, updatedBy, lines: [] };
    }
  });

  const registered = await useCases.registerAnnualBudget(
    4,
    {
      year: 2026,
      lines: [{ code: 'MNT', name: 'Mantenimiento', classification: 'gasto', amount: 1000 }]
    },
    2
  );
  assert.equal(registered.version, 3);

  const approved = await useCases.updateAnnualBudgetStatus(4, 41, 'aprobado', 2);
  assert.equal(approved.status, 'aprobado');
});

test('HU-054 rechaza códigos duplicados y estados inválidos', async () => {
  const useCases = createBudgetUseCases({
    async nextVersionForBuildingYear() {
      return 1;
    }
  });

  await assert.rejects(
    () =>
      useCases.registerAnnualBudget(4, {
        year: 2026,
        lines: [
          { code: 'ASE', name: 'Aseo', classification: 'gasto', amount: 1 },
          { code: 'ase', name: 'Otro', classification: 'gasto', amount: 2 }
        ]
      }),
    { code: 'DUPLICATE_BUDGET_LINES', statusCode: 400 }
  );
  await assert.rejects(
    () => useCases.updateAnnualBudgetStatus(4, 1, 'publicado', 1),
    { code: 'INVALID_BUDGET_STATUS', statusCode: 400 }
  );
});
