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

test('HU-057 / CP-057-01: genera reporte filtrable por vigencia, periodo y partida', async () => {
  let received;
  const useCases = createBudgetUseCases({
    async findBudgetReport(filters) {
      received = filters;
      return {
        budgetId: 5,
        budgetStatus: 'aprobado',
        lines: [
          {
            budgetLineId: 10,
            code: 'ASE',
            name: 'Aseo',
            classification: 'gasto',
            budgetedAmount: 10000000,
            executedAmount: 4000000
          }
        ],
        executions: [
          {
            id: 1,
            budgetLineId: 10,
            lineCode: 'ASE',
            lineName: 'Aseo',
            executionDate: '2026-03-10',
            amount: 4000000,
            description: 'Marzo'
          }
        ]
      };
    }
  });

  const report = await useCases.generateBudgetReport(4, {
    year: 2026,
    fromDate: '2026-01-01',
    toDate: '2026-06-30',
    lineCode: 'ase'
  });

  assert.deepEqual(received, {
    buildingId: 4,
    year: 2026,
    fromDate: '2026-01-01',
    toDate: '2026-06-30',
    lineCode: 'ASE'
  });
  assert.equal(report.totalBudgeted, 10000000);
  assert.equal(report.totalExecuted, 4000000);
  assert.equal(report.totalAvailable, 6000000);
  assert.equal(report.lines[0].availableAmount, 6000000);
  assert.equal(report.executions.length, 1);
});

test('HU-057 rechaza periodo inválido', async () => {
  const useCases = createBudgetUseCases({});
  await assert.rejects(
    () =>
      useCases.generateBudgetReport(4, {
        year: 2026,
        fromDate: '2026-12-01',
        toDate: '2026-01-01'
      }),
    { code: 'INVALID_REPORT_PERIOD', statusCode: 400 }
  );
});
