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

test('HU-056 / CP-056-01: calcula variación en valor y porcentaje por partida', async () => {
  const useCases = createBudgetUseCases({
    async findBudgetComparison(buildingId, year) {
      assert.equal(buildingId, 4);
      assert.equal(year, 2026);
      return {
        budgetId: 7,
        budgetStatus: 'aprobado',
        lines: [
          {
            sourceLineId: 10,
            code: 'ASE',
            name: 'Aseo',
            classification: 'gasto',
            budgetedAmount: 10000000,
            executedAmount: 12500000
          },
          {
            sourceLineId: 11,
            code: 'VIG',
            name: 'Vigilancia',
            classification: 'gasto',
            budgetedAmount: 20000000,
            executedAmount: 8000000
          },
          {
            sourceLineId: 12,
            code: 'MAN',
            name: 'Mantenimiento',
            classification: 'gasto',
            budgetedAmount: 15000000,
            executedAmount: 15000000
          }
        ]
      };
    }
  });

  const comparison = await useCases.compareBudgetExecution(4, 2026);
  assert.equal(comparison.budgetStatus, 'aprobado');
  assert.equal(comparison.lines[0].varianceAmount, 2500000);
  assert.equal(comparison.lines[0].variancePercent, 25);
  assert.equal(comparison.lines[0].alert, 'sobreejecucion');
  assert.equal(comparison.lines[1].varianceAmount, -12000000);
  assert.equal(comparison.lines[1].variancePercent, -60);
  assert.equal(comparison.lines[1].alert, 'baja_ejecucion');
  assert.equal(comparison.lines[2].alert, 'normal');
  assert.equal(comparison.overExecutedCount, 1);
  assert.equal(comparison.underExecutedCount, 1);
  assert.equal(comparison.totalVariance, -9500000);
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

function monthsWith(amountsByMonth) {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    amount: amountsByMonth[index + 1] ?? 0
  }));
}

test('proyecta el gasto del año anterior, excluye no recurrentes y suma los incrementos', async () => {
  const useCases = createBudgetUseCases({
    async findExpenseProjectionSources(buildingId, year) {
      assert.equal(buildingId, 4);
      assert.equal(year, 2025);
      return {
        expenseLines: [
          { code: 'ASE', name: 'Aseo', months: monthsWith({ 1: 100, 2: 50 }) },
          { code: 'VIG', name: 'Vigilancia', months: monthsWith({ 1: 200 }) }
        ],
        adminPayments: monthsWith({ 1: 9000 }),
        fines: monthsWith({ 1: 999 }),
        nonAdminGains: monthsWith({ 1: 500 }),
        extraCharges: monthsWith({ 3: 40 })
      };
    }
  });

  const projection = await useCases.projectExpenses(4, {
    year: 2025,
    increments: [
      { code: 'ase', percent: 10 },
      { code: 'VIG', percent: 0 }
    ]
  });

  assert.equal(projection.basis, 'gastos');
  assert.equal(projection.totalBase, 350);
  assert.equal(projection.totalProjected, 365);
  assert.equal(projection.totalExcluded, 1539);
  assert.equal(projection.categories[0].projectedAmount, 165);
  assert.equal(projection.categories[1].projectedAmount, 200);
  assert.equal(projection.months[0].projectedAmount, 310);
  assert.equal(projection.excluded.find((item) => item.code === 'MULTAS').amount, 999);
});

test('discrimina la proyección por mes', async () => {
  const useCases = createBudgetUseCases({
    async findExpenseProjectionSources() {
      return {
        expenseLines: [{ code: 'ASE', name: 'Aseo', months: monthsWith({ 1: 100, 2: 50 }) }],
        adminPayments: monthsWith({}),
        fines: monthsWith({ 2: 80 }),
        nonAdminGains: monthsWith({}),
        extraCharges: monthsWith({})
      };
    }
  });

  const february = await useCases.projectExpenses(4, {
    year: 2025,
    month: 2,
    increments: [{ code: 'ASE', percent: 20 }]
  });

  assert.equal(february.totalBase, 50);
  assert.equal(february.totalProjected, 60);
  assert.equal(february.totalExcluded, 80);
  assert.equal(february.categories[0].months[0].projectedAmount, 120);
});

test('si no hay gastos presupuestales usa los pagos de administración y deja fuera multas y extras', async () => {
  const useCases = createBudgetUseCases({
    async findExpenseProjectionSources() {
      return {
        expenseLines: [],
        adminPayments: monthsWith({ 4: 1000 }),
        fines: monthsWith({ 4: 300 }),
        nonAdminGains: monthsWith({ 4: 150 }),
        extraCharges: monthsWith({ 4: 25 })
      };
    }
  });

  const projection = await useCases.projectExpenses(4, {
    year: 2025,
    increments: [{ code: 'ADMIN', percent: 5 }]
  });

  assert.equal(projection.basis, 'administracion');
  assert.equal(projection.totalBase, 1000);
  assert.equal(projection.totalProjected, 1050);
  assert.equal(projection.totalExcluded, 475);
});

test('excluye gastos extraordinarios, acepta un valor manual y suma partidas nuevas', async () => {
  const useCases = createBudgetUseCases({
    async findExpenseProjectionSources() {
      return {
        expenseLines: [
          { code: 'ASE', name: 'Aseo', months: monthsWith({ 1: 100, 2: 100 }) },
          { code: 'VIG', name: 'Vigilancia', months: monthsWith({ 1: 200 }) }
        ],
        extraordinaryLines: [
          { code: 'FAC', name: 'Fachada', months: monthsWith({ 3: 500 }) }
        ],
        adminPayments: monthsWith({}),
        fines: monthsWith({}),
        nonAdminGains: monthsWith({}),
        extraCharges: monthsWith({})
      };
    }
  });

  const projection = await useCases.projectExpenses(4, {
    year: 2025,
    increments: [{ code: 'VIG', percent: 10 }],
    overrides: [{ code: 'ASE', amount: 300 }],
    manualLines: [{ code: 'SEG', name: 'Seguro nuevo', amount: 1200 }]
  });

  assert.equal(projection.basis, 'gastos');
  assert.equal(projection.categories.find((item) => item.code === 'ASE').projectedAmount, 300);
  assert.equal(projection.categories.find((item) => item.code === 'ASE').manual, true);
  assert.equal(projection.categories.find((item) => item.code === 'VIG').projectedAmount, 220);
  const seguro = projection.categories.find((item) => item.code === 'SEG');
  assert.equal(seguro.source, 'manual');
  assert.equal(seguro.baseAmount, 0);
  assert.equal(seguro.projectedAmount, 1200);
  assert.equal(seguro.months[0].projectedAmount, 100);
  assert.equal(projection.totalBase, 400);
  assert.equal(projection.totalProjected, 1720);
  assert.equal(projection.totalExcluded, 500);
  assert.equal(
    projection.excluded.find((item) => item.code === 'FAC').reason,
    'Gasto extraordinario no recurrente'
  );
  assert.equal(projection.months[0].projectedAmount, 150 + 220 + 100);
});

test('rechaza una partida manual que repite un gasto del año anterior', async () => {
  const useCases = createBudgetUseCases({
    async findExpenseProjectionSources() {
      return {
        expenseLines: [{ code: 'ASE', name: 'Aseo', months: monthsWith({ 1: 10 }) }],
        extraordinaryLines: [],
        adminPayments: monthsWith({}),
        fines: monthsWith({}),
        nonAdminGains: monthsWith({}),
        extraCharges: monthsWith({})
      };
    }
  });

  await assert.rejects(
    () =>
      useCases.projectExpenses(4, {
        year: 2025,
        manualLines: [{ code: 'ase', name: 'Otro aseo', amount: 50 }]
      }),
    (error) => error.code === 'DUPLICATE_BUDGET_LINES'
  );
});

test('rechaza un porcentaje de crecimiento fuera de rango', async () => {
  const useCases = createBudgetUseCases({
    async findExpenseProjectionSources() {
      throw new Error('no debe consultar la base');
    }
  });

  await assert.rejects(
    () => useCases.projectExpenses(4, { year: 2025, increments: [{ code: 'ASE', percent: 1001 }] }),
    (error) => error.code === 'INVALID_GROWTH_PERCENT'
  );
});

test('HU-057 usa el año completo cuando no se especifica un periodo', async () => {
  let received;
  const useCases = createBudgetUseCases({
    async findBudgetReport(filters) {
      received = filters;
      return { budgetId: null, budgetStatus: null, lines: [], executions: [] };
    }
  });

  const report = await useCases.generateBudgetReport(4, { year: 2026 });

  assert.deepEqual(received, {
    buildingId: 4,
    year: 2026,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
    lineCode: null
  });
  assert.equal(report.totalAvailable, 0);
});
