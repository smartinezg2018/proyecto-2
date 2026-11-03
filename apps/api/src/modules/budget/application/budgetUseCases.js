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
