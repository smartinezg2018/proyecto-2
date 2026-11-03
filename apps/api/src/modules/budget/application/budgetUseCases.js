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

    async registerExecution(buildingId, input, createdBy) {
      const numericBuildingId = Number(buildingId);
      const budgetLineId = Number(input.budgetLineId);
      const amount = roundMoney(input.amount);
      if (!(amount > 0)) {
        throw new AppError(
          'El valor ejecutado debe ser mayor que cero.',
          400,
          'INVALID_EXECUTION_AMOUNT'
        );
      }

      const line = await repository.findBudgetLineForBuilding(numericBuildingId, budgetLineId);
      if (!line) {
        throw new AppError(
          'La partida no pertenece al presupuesto del edificio.',
          404,
          'BUDGET_LINE_NOT_FOUND'
        );
      }

      const execution = await repository.createExecution({
        budgetLineId,
        executionDate: input.executionDate,
        amount,
        description: input.description || null,
        createdBy
      });

      const balance = await repository.getLineBalance(budgetLineId);
      return {
        execution,
        line: {
          id: line.id,
          code: line.code,
          name: line.name,
          classification: line.classification,
          budgetedAmount: line.budgetedAmount,
          executedAmount: balance.executedAmount,
          availableAmount: roundMoney(line.budgetedAmount - balance.executedAmount)
        }
      };
    },

    async listBudgetLines(buildingId, year) {
      return repository.listBudgetLinesForBuilding(Number(buildingId), Number(year));
    }
  };
}
