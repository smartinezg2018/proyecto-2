import { AppError } from '../../../shared/errors/AppError.js';

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function createBudgetUseCases(repository) {
  return {
    async getPreviousExecution(buildingId, year) {
      const numericBuildingId = Number(buildingId);
      const numericYear = Number(year);
      const lines = await repository.findExecutionSummary(numericBuildingId, numericYear);
      return {
        buildingId: numericBuildingId,
        year: numericYear,
        lines,
        totalBudgeted: roundMoney(lines.reduce((sum, line) => sum + line.budgetedAmount, 0)),
        totalExecuted: roundMoney(lines.reduce((sum, line) => sum + line.executedAmount, 0))
      };
    },

    async createFromExecution(buildingId, input, createdBy) {
      const numericBuildingId = Number(buildingId);
      const sourceYear = Number(input.sourceYear);
      const targetYear = Number(input.targetYear);
      if (targetYear !== sourceYear + 1) {
        throw new AppError(
          'El año destino debe ser el año siguiente al periodo consultado.',
          400,
          'INVALID_BUDGET_PERIOD'
        );
      }

      const source = await this.getPreviousExecution(numericBuildingId, sourceYear);
      if (source.lines.length === 0) {
        throw new AppError(
          'No existe ejecución presupuestal para el año indicado.',
          400,
          'BUDGET_EXECUTION_NOT_FOUND'
        );
      }

      const requestedIds = input.lines.map((line) => Number(line.sourceLineId));
      if (new Set(requestedIds).size !== requestedIds.length) {
        throw new AppError(
          'No puede repetir partidas en la proyección.',
          400,
          'DUPLICATE_BUDGET_LINES'
        );
      }
      if (requestedIds.length !== source.lines.length) {
        throw new AppError(
          'Debe incluir todas las partidas del periodo anterior.',
          400,
          'INCOMPLETE_BUDGET_LINES'
        );
      }

      const amountByLineId = new Map(
        input.lines.map((line) => [Number(line.sourceLineId), roundMoney(line.amount)])
      );
      const unknownLine = requestedIds.find(
        (lineId) => !source.lines.some((line) => line.sourceLineId === lineId)
      );
      if (unknownLine != null) {
        throw new AppError(
          'Una partida no pertenece al presupuesto del edificio y año indicados.',
          400,
          'BUDGET_LINE_MISMATCH'
        );
      }

      const existing = await repository.findDraftByBuildingYear(numericBuildingId, targetYear);
      if (existing) {
        throw new AppError(
          'Ya existe un presupuesto en borrador para el año destino.',
          409,
          'BUDGET_ALREADY_EXISTS'
        );
      }

      return repository.createDraftFromExecution({
        buildingId: numericBuildingId,
        sourceYear,
        targetYear,
        createdBy,
        lines: source.lines.map((line) => ({
          code: line.code,
          name: line.name,
          classification: line.classification,
          amount: amountByLineId.get(line.sourceLineId)
        }))
      });
    },

    async compareBudgetExecution(buildingId, year) {
      const numericBuildingId = Number(buildingId);
      const numericYear = Number(year);
      const summary = await repository.findBudgetComparison(numericBuildingId, numericYear);
      const lines = summary.lines.map((line) => {
        const budgetedAmount = roundMoney(line.budgetedAmount);
        const executedAmount = roundMoney(line.executedAmount);
        const varianceAmount = roundMoney(executedAmount - budgetedAmount);
        const variancePercent =
          budgetedAmount === 0
            ? executedAmount === 0
              ? 0
              : null
            : roundMoney((varianceAmount / budgetedAmount) * 100);
        let alert = 'normal';
        if (executedAmount > budgetedAmount) {
          alert = 'sobreejecucion';
        } else if (budgetedAmount > 0 && executedAmount / budgetedAmount < 0.5) {
          alert = 'baja_ejecucion';
        }
        return {
          ...line,
          budgetedAmount,
          executedAmount,
          varianceAmount,
          variancePercent,
          alert
        };
      });

      const totalBudgeted = roundMoney(lines.reduce((sum, line) => sum + line.budgetedAmount, 0));
      const totalExecuted = roundMoney(lines.reduce((sum, line) => sum + line.executedAmount, 0));
      const totalVariance = roundMoney(totalExecuted - totalBudgeted);

      return {
        buildingId: numericBuildingId,
        year: numericYear,
        budgetId: summary.budgetId,
        budgetStatus: summary.budgetStatus,
        lines,
        totalBudgeted,
        totalExecuted,
        totalVariance,
        totalVariancePercent:
          totalBudgeted === 0
            ? totalExecuted === 0
              ? 0
              : null
            : roundMoney((totalVariance / totalBudgeted) * 100),
        overExecutedCount: lines.filter((line) => line.alert === 'sobreejecucion').length,
        underExecutedCount: lines.filter((line) => line.alert === 'baja_ejecucion').length
      };
    }
  };
}
