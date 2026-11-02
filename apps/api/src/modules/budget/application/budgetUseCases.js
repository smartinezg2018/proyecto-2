import { AppError } from '../../../shared/errors/AppError.js';

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizePercent(value, label) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    throw new AppError(`${label} debe ser numérico.`, 400, 'VALIDATION_ERROR');
  }
  if (percent < -100) {
    throw new AppError(`${label} no puede ser menor a -100.`, 400, 'VALIDATION_ERROR');
  }
  return percent;
}

function buildIncrementPreview(lines, { generalPercent = 0, linePercents = [] }) {
  const overrides = new Map(
    linePercents.map((item) => [Number(item.lineId), normalizePercent(item.percent, 'El porcentaje')] )
  );

  return lines.map((line) => {
    const percent = overrides.has(line.id)
      ? overrides.get(line.id)
      : normalizePercent(generalPercent, 'El porcentaje general');
    const currentAmount = Number(line.amount);
    const projectedAmount = roundMoney(currentAmount * (1 + percent / 100));
    return {
      lineId: line.id,
      code: line.code,
      name: line.name,
      classification: line.classification,
      currentAmount,
      percent,
      projectedAmount
    };
  });
}

export function createBudgetUseCases(repository) {
  return {
    async getDraftBudget(buildingId, year) {
      const budget = await repository.findDraftByBuildingYear(Number(buildingId), Number(year));
      if (!budget) {
        throw new AppError('No existe un presupuesto en borrador para ese año.', 404, 'BUDGET_NOT_FOUND');
      }
      return budget;
    },

    async ensureDraftBudget(buildingId, input, createdBy) {
      return repository.ensureDraftBudget({
        buildingId: Number(buildingId),
        year: Number(input.year),
        lines: input.lines || [],
        createdBy
      });
    },

    async previewIncrements(buildingId, input) {
      const budget = await repository.findDraftByBuildingYear(Number(buildingId), Number(input.year));
      if (!budget) {
        throw new AppError('No existe un presupuesto en borrador para ese año.', 404, 'BUDGET_NOT_FOUND');
      }
      if (!budget.lines.length) {
        throw new AppError('El presupuesto no tiene partidas para incrementar.', 400, 'BUDGET_WITHOUT_LINES');
      }

      const preview = buildIncrementPreview(budget.lines, input);
      return {
        budgetId: budget.id,
        year: budget.year,
        lines: preview,
        totalCurrent: roundMoney(preview.reduce((sum, line) => sum + line.currentAmount, 0)),
        totalProjected: roundMoney(preview.reduce((sum, line) => sum + line.projectedAmount, 0))
      };
    },

    async applyIncrements(buildingId, input, updatedBy) {
      const preview = await this.previewIncrements(buildingId, input);
      return repository.applyLineAmounts({
        budgetId: preview.budgetId,
        updates: preview.lines.map((line) => ({
          lineId: line.lineId,
          amount: line.projectedAmount
        })),
        updatedBy
      });
    }
  };
}
