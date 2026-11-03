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

test('HU-055 / CP-055-01: registra ejecución asociada a una partida y actualiza saldo', async () => {
  let created;
  const useCases = createBudgetUseCases({
    async findBudgetLineForBuilding(buildingId, budgetLineId) {
      assert.equal(buildingId, 4);
      assert.equal(budgetLineId, 10);
      return {
        id: 10,
        code: 'ASE',
        name: 'Aseo',
        classification: 'gasto',
        budgetedAmount: 45000000
      };
    },
    async createExecution(input) {
      created = input;
      return { id: 90, ...input };
    },
    async getLineBalance(budgetLineId) {
      assert.equal(budgetLineId, 10);
      return { executedAmount: 5000000 };
    }
  });

  const result = await useCases.registerExecution(
    4,
    {
      budgetLineId: 10,
      executionDate: '2026-03-15',
      amount: 5000000,
      description: 'Servicio febrero'
    },
    3
  );

  assert.equal(created.createdBy, 3);
  assert.equal(result.line.executedAmount, 5000000);
  assert.equal(result.line.availableAmount, 40000000);
});

test('HU-055 rechaza montos no positivos y partidas ajenas al edificio', async () => {
  const useCases = createBudgetUseCases({
    async findBudgetLineForBuilding() {
      return null;
    }
  });

  await assert.rejects(
    () =>
      useCases.registerExecution(4, {
        budgetLineId: 10,
        executionDate: '2026-01-01',
        amount: 0
      }),
    { code: 'INVALID_EXECUTION_AMOUNT', statusCode: 400 }
  );
  await assert.rejects(
    () =>
      useCases.registerExecution(4, {
        budgetLineId: 99,
        executionDate: '2026-01-01',
        amount: 1000
      }),
    { code: 'BUDGET_LINE_NOT_FOUND', statusCode: 404 }
  );
});
