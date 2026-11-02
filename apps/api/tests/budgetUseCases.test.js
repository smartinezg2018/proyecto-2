import test from 'node:test';
import assert from 'node:assert/strict';
import { createBudgetUseCases } from '../src/modules/budget/application/budgetUseCases.js';

test('HU-053 previsualiza incrementos generales e individuales', async () => {
  const useCases = createBudgetUseCases({
    async findDraftByBuildingYear() {
      return {
        id: 3,
        year: 2026,
        lines: [
          { id: 1, code: 'VIG', name: 'Vigilancia', classification: 'gasto', amount: 100000 },
          { id: 2, code: 'ASE', name: 'Aseo', classification: 'gasto', amount: 50000 }
        ]
      };
    }
  });

  const preview = await useCases.previewIncrements(4, {
    year: 2026,
    generalPercent: 10,
    linePercents: [{ lineId: 2, percent: 5 }]
  });

  assert.equal(preview.lines[0].projectedAmount, 110000);
  assert.equal(preview.lines[1].projectedAmount, 52500);
  assert.equal(preview.totalProjected, 162500);
});

test('HU-053 aplica los valores proyectados al guardar', async () => {
  let applied;
  const useCases = createBudgetUseCases({
    async findDraftByBuildingYear() {
      return {
        id: 3,
        year: 2026,
        lines: [{ id: 1, code: 'VIG', name: 'Vigilancia', classification: 'gasto', amount: 200000 }]
      };
    },
    async applyLineAmounts(input) {
      applied = input;
      return { id: 3, lines: [{ id: 1, amount: 220000 }] };
    }
  });

  const budget = await useCases.applyIncrements(4, { year: 2026, generalPercent: 10 }, 7);
  assert.equal(budget.lines[0].amount, 220000);
  assert.deepEqual(applied.updates, [{ lineId: 1, amount: 220000 }]);
  assert.equal(applied.updatedBy, 7);
});
