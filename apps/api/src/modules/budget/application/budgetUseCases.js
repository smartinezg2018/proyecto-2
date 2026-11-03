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

    async generateBudgetReport(buildingId, filters = {}) {
      const numericBuildingId = Number(buildingId);
      const year = Number(filters.year);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new AppError('El año del reporte no es válido.', 400, 'VALIDATION_ERROR');
      }

      const fromDate = filters.fromDate || `${year}-01-01`;
      const toDate = filters.toDate || `${year}-12-31`;
      if (fromDate > toDate) {
        throw new AppError(
          'La fecha inicial del periodo no puede ser posterior a la final.',
          400,
          'INVALID_REPORT_PERIOD'
        );
      }

      const lineCode =
        filters.lineCode == null || String(filters.lineCode).trim() === ''
          ? null
          : String(filters.lineCode).trim().toUpperCase();

      const report = await repository.findBudgetReport({
        buildingId: numericBuildingId,
        year,
        fromDate,
        toDate,
        lineCode
      });

      const lines = report.lines.map((line) => ({
        ...line,
        budgetedAmount: roundMoney(line.budgetedAmount),
        executedAmount: roundMoney(line.executedAmount),
        availableAmount: roundMoney(line.budgetedAmount - line.executedAmount)
      }));

      return {
        buildingId: numericBuildingId,
        year,
        fromDate,
        toDate,
        lineCode,
        budgetId: report.budgetId,
        budgetStatus: report.budgetStatus,
        lines,
        executions: report.executions.map((row) => ({
          ...row,
          amount: roundMoney(row.amount)
        })),
        totalBudgeted: roundMoney(lines.reduce((sum, line) => sum + line.budgetedAmount, 0)),
        totalExecuted: roundMoney(lines.reduce((sum, line) => sum + line.executedAmount, 0)),
        totalAvailable: roundMoney(lines.reduce((sum, line) => sum + line.availableAmount, 0))
      };
    }
  };
}
