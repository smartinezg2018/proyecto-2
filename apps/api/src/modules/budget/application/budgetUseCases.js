import { AppError } from '../../../shared/errors/AppError.js';

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function distributeAmount(total, weights) {
  const normalized = weights.map((weight) => Math.max(0, Number(weight) || 0));
  const weightTotal = normalized.reduce((sum, weight) => sum + weight, 0);
  const shares =
    weightTotal > 0
      ? normalized.map((weight) => roundMoney((Number(total) * weight) / weightTotal))
      : Array.from({ length: normalized.length }, () => roundMoney(Number(total) / normalized.length));
  const drift = roundMoney(Number(total) - shares.reduce((sum, value) => sum + value, 0));
  if (shares.length > 0) {
    shares[shares.length - 1] = roundMoney(shares[shares.length - 1] + drift);
  }
  return shares;
}

function monthsFromManualLine(line) {
  if (Array.isArray(line.months) && line.months.length > 0) {
    const seen = new Set();
    const amounts = Array.from({ length: 12 }, () => 0);
    for (const entry of line.months) {
      const month = Number(entry.month);
      if (seen.has(month)) {
        throw new AppError('No puede repetir un mes en una partida manual.', 400, 'VALIDATION_ERROR');
      }
      seen.add(month);
      amounts[month - 1] = roundMoney(entry.amount);
    }
    return amounts.map((amount, index) => ({ month: index + 1, amount }));
  }
  if (line.amount == null || line.amount === '') {
    throw new AppError(
      'Indique el valor de la partida que no se ejecutó el año anterior.',
      400,
      'VALIDATION_ERROR'
    );
  }
  return distributeAmount(roundMoney(line.amount), Array.from({ length: 12 }, () => 1)).map(
    (amount, index) => ({ month: index + 1, amount })
  );
}

export function createBudgetUseCases(repository) {
  return {
    async projectExpenses(buildingId, input = {}) {
      const numericYear = Number(input.year);
      if (!Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 2100) {
        throw new AppError('El año consultado no es válido.', 400, 'VALIDATION_ERROR');
      }
      const month = input.month == null || input.month === '' ? null : Number(input.month);
      if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
        throw new AppError('El mes consultado no es válido.', 400, 'VALIDATION_ERROR');
      }

      const increments = new Map();
      for (const item of input.increments || []) {
        const code = String(item.code).trim().toUpperCase();
        const percent = Number(item.percent);
        if (!Number.isFinite(percent) || percent < -100 || percent > 1000) {
          throw new AppError(
            'El porcentaje de crecimiento debe estar entre -100 y 1000.',
            400,
            'INVALID_GROWTH_PERCENT'
          );
        }
        increments.set(code, percent);
      }

      const manualOverrides = new Map();
      for (const item of input.overrides || []) {
        const code = String(item.code).trim().toUpperCase();
        const amount = Number(item.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          throw new AppError('El valor manual de la partida no es válido.', 400, 'VALIDATION_ERROR');
        }
        manualOverrides.set(code, roundMoney(amount));
      }

      const sources = await repository.findExpenseProjectionSources(
        Number(buildingId),
        numericYear
      );
      const extraordinaryLines = sources.extraordinaryLines || [];
      const recurringLines = (sources.expenseLines || []).filter((category) =>
        category.months.some((item) => Number(item.amount) > 0)
      );
      const hasExpenseActivity = recurringLines.length > 0 || extraordinaryLines.length > 0;
      const sourceCategories = recurringLines.length
        ? recurringLines
        : hasExpenseActivity
          ? []
          : [
              {
                code: 'ADMIN',
                name: 'Pagos de administración',
                months: sources.adminPayments
              }
            ];

      const historicalCodes = new Set(
        sourceCategories.map((category) => String(category.code).toUpperCase())
      );
      for (const code of manualOverrides.keys()) {
        if (!historicalCodes.has(code)) {
          throw new AppError(
            `La partida ${code} no está en los gastos recurrentes del año anterior.`,
            400,
            'BUDGET_LINE_MISMATCH'
          );
        }
      }

      const categories = sourceCategories.map((category) => {
        const code = String(category.code).toUpperCase();
        const incrementPercent = increments.get(code) ?? 0;
        const factor = 1 + incrementPercent / 100;
        const manualAnnual = manualOverrides.has(code) ? manualOverrides.get(code) : null;
        const projectedShares =
          manualAnnual == null
            ? null
            : distributeAmount(
                manualAnnual,
                category.months.map((item) => item.amount)
              );
        const months = category.months.map((item, index) => {
          const baseAmount = roundMoney(item.amount);
          return {
            month: item.month,
            baseAmount,
            projectedAmount: projectedShares
              ? projectedShares[index]
              : roundMoney(baseAmount * factor)
          };
        });
        const scoped = month == null ? months : months.filter((item) => item.month === month);
        return {
          code,
          name: category.name,
          source: 'historico',
          manual: manualAnnual != null,
          incrementPercent,
          baseAmount: roundMoney(scoped.reduce((sum, item) => sum + item.baseAmount, 0)),
          projectedAmount: roundMoney(scoped.reduce((sum, item) => sum + item.projectedAmount, 0)),
          months
        };
      });

      const manualCodes = new Set();
      for (const line of input.manualLines || []) {
        const code = String(line.code).trim().toUpperCase();
        if (historicalCodes.has(code) || manualCodes.has(code)) {
          throw new AppError(
            'No puede repetir códigos de partida en la proyección.',
            400,
            'DUPLICATE_BUDGET_LINES'
          );
        }
        manualCodes.add(code);
        const projectedMonths = monthsFromManualLine(line).map((item) => ({
          month: item.month,
          baseAmount: 0,
          projectedAmount: roundMoney(item.amount)
        }));
        const scoped =
          month == null
            ? projectedMonths
            : projectedMonths.filter((item) => item.month === month);
        categories.push({
          code,
          name: String(line.name).trim(),
          source: 'manual',
          manual: true,
          incrementPercent: 0,
          baseAmount: 0,
          projectedAmount: roundMoney(
            scoped.reduce((sum, item) => sum + item.projectedAmount, 0)
          ),
          months: projectedMonths
        });
      }

      const excluded = [
        ...extraordinaryLines.map((line) => ({
          code: String(line.code).toUpperCase(),
          name: line.name,
          reason: 'Gasto extraordinario no recurrente',
          months: line.months
        })),
        {
          code: 'MULTAS',
          name: 'Multas a apartamentos',
          reason: 'Gasto no recurrente',
          months: sources.fines
        },
        {
          code: 'NO_ADMIN',
          name: 'Ganancias no marcadas como pago de administración',
          reason: 'No son pago de administración',
          months: sources.nonAdminGains
        },
        {
          code: 'EXTRA',
          name: 'Cargos extraordinarios',
          reason: 'Gasto no recurrente',
          months: sources.extraCharges
        }
      ].map((item) => {
        const months = item.months.map((entry) => ({
          month: entry.month,
          amount: roundMoney(entry.amount)
        }));
        const scoped = month == null ? months : months.filter((entry) => entry.month === month);
        return {
          code: item.code,
          name: item.name,
          reason: item.reason,
          amount: roundMoney(scoped.reduce((sum, entry) => sum + entry.amount, 0)),
          months
        };
      });

      const monthTotals = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        baseAmount: roundMoney(
          categories.reduce((sum, category) => sum + category.months[index].baseAmount, 0)
        ),
        projectedAmount: roundMoney(
          categories.reduce((sum, category) => sum + category.months[index].projectedAmount, 0)
        ),
        excludedAmount: roundMoney(
          excluded.reduce((sum, item) => sum + item.months[index].amount, 0)
        )
      }));
      const scopedMonths = month == null ? monthTotals : monthTotals.filter((item) => item.month === month);

      return {
        buildingId: Number(buildingId),
        sourceYear: numericYear,
        targetYear: numericYear + 1,
        month,
        basis: hasExpenseActivity ? 'gastos' : 'administracion',
        categories,
        excluded,
        months: monthTotals,
        totalBase: roundMoney(scopedMonths.reduce((sum, item) => sum + item.baseAmount, 0)),
        totalProjected: roundMoney(
          scopedMonths.reduce((sum, item) => sum + item.projectedAmount, 0)
        ),
        totalExcluded: roundMoney(scopedMonths.reduce((sum, item) => sum + item.excludedAmount, 0))
      };
    },

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
        extraordinary: Boolean(input.extraordinary),
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
