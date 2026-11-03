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

    async registerAnnualBudget(buildingId, input, createdBy) {
      const numericBuildingId = Number(buildingId);
      const year = Number(input.year);
      const status = input.status || 'borrador';
      if (!['borrador', 'aprobado'].includes(status)) {
        throw new AppError(
          'El estado del presupuesto debe ser borrador o aprobado.',
          400,
          'INVALID_BUDGET_STATUS'
        );
      }

      const codes = input.lines.map((line) => String(line.code).trim().toUpperCase());
      if (new Set(codes).size !== codes.length) {
        throw new AppError(
          'No puede repetir códigos de partida en el presupuesto.',
          400,
          'DUPLICATE_BUDGET_LINES'
        );
      }

      const nextVersion = await repository.nextVersionForBuildingYear(numericBuildingId, year);
      return repository.createAnnualBudget({
        buildingId: numericBuildingId,
        year,
        version: nextVersion,
        status,
        createdBy,
        lines: input.lines.map((line) => ({
          code: String(line.code).trim().toUpperCase(),
          name: String(line.name).trim(),
          classification: line.classification,
          amount: roundMoney(line.amount)
        }))
      });
    },

    async listAnnualBudgets(buildingId, year) {
      return repository.listAnnualBudgets(Number(buildingId), year == null ? null : Number(year));
    },

    async getAnnualBudget(buildingId, budgetId) {
      const budget = await repository.findAnnualBudgetById(Number(budgetId));
      if (!budget || budget.buildingId !== Number(buildingId)) {
        throw new AppError('Presupuesto no encontrado.', 404, 'BUDGET_NOT_FOUND');
      }
      return budget;
    },

    async updateAnnualBudgetStatus(buildingId, budgetId, status, updatedBy) {
      if (!['borrador', 'aprobado', 'cerrado'].includes(status)) {
        throw new AppError(
          'El estado del presupuesto no es válido.',
          400,
          'INVALID_BUDGET_STATUS'
        );
      }
      const budget = await this.getAnnualBudget(buildingId, budgetId);
      return repository.updateAnnualBudgetStatus(budget.id, status, updatedBy);
    }
  };
}
