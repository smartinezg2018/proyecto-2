import { QueryTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../../../../database/connection.js';
import { AnnualBudget, BudgetLine } from '../../../../database/models/index.js';

function mapBudget(budget) {
  const data = budget.get({ plain: true });
  return {
    id: Number(data.id),
    buildingId: Number(data.buildingId),
    year: Number(data.year),
    version: Number(data.version),
    status: data.status,
    lines: (data.lines || []).map((line) => ({
      id: Number(line.id),
      code: line.code,
      name: line.name,
      classification: line.classification,
      amount: Number(line.amount)
    }))
  };
}

export class BudgetRepository {
  async findExecutionSummary(buildingId, year) {
    const rows = await sequelize.query(
      `SELECT bl.id AS sourceLineId,
              bl.code,
              bl.name,
              bl.classification,
              bl.amount AS budgetedAmount,
              COALESCE(SUM(be.amount), 0) AS executedAmount
       FROM annual_budgets ab
       INNER JOIN budget_lines bl ON bl.budget_id = ab.id
       LEFT JOIN budget_executions be
         ON be.budget_line_id = bl.id
        AND be.execution_date >= STR_TO_DATE(CONCAT(:year, '-01-01'), '%Y-%m-%d')
        AND be.execution_date < STR_TO_DATE(CONCAT(:nextYear, '-01-01'), '%Y-%m-%d')
       WHERE ab.id = (
         SELECT selected.id
         FROM annual_budgets selected
         WHERE selected.building_id = :buildingId
           AND selected.year = :year
         ORDER BY selected.version DESC
         LIMIT 1
       )
       GROUP BY bl.id, bl.code, bl.name, bl.classification, bl.amount
       ORDER BY bl.code ASC`,
      {
        replacements: { buildingId, year, nextYear: Number(year) + 1 },
        type: QueryTypes.SELECT
      }
    );
    return rows.map((row) => ({
      sourceLineId: Number(row.sourceLineId),
      code: row.code,
      name: row.name,
      classification: row.classification,
      budgetedAmount: Number(row.budgetedAmount),
      executedAmount: Number(row.executedAmount)
    }));
  }

  async findBudgetComparison(buildingId, year) {
    const budgets = await sequelize.query(
      `SELECT id, status
       FROM annual_budgets
       WHERE building_id = :buildingId
         AND year = :year
       ORDER BY CASE
         WHEN status = 'aprobado' THEN 0
         WHEN status = 'cerrado' THEN 1
         ELSE 2
       END,
       version DESC
       LIMIT 1`,
      {
        replacements: { buildingId, year },
        type: QueryTypes.SELECT
      }
    );
    const budget = budgets[0];
    if (!budget) {
      return { budgetId: null, budgetStatus: null, lines: [] };
    }

    const rows = await sequelize.query(
      `SELECT bl.id AS sourceLineId,
              bl.code,
              bl.name,
              bl.classification,
              bl.amount AS budgetedAmount,
              COALESCE(SUM(be.amount), 0) AS executedAmount
       FROM budget_lines bl
       LEFT JOIN budget_executions be
         ON be.budget_line_id = bl.id
        AND be.execution_date >= STR_TO_DATE(CONCAT(:year, '-01-01'), '%Y-%m-%d')
        AND be.execution_date < STR_TO_DATE(CONCAT(:nextYear, '-01-01'), '%Y-%m-%d')
       WHERE bl.budget_id = :budgetId
       GROUP BY bl.id, bl.code, bl.name, bl.classification, bl.amount
       ORDER BY bl.code ASC`,
      {
        replacements: {
          budgetId: budget.id,
          year,
          nextYear: Number(year) + 1
        },
        type: QueryTypes.SELECT
      }
    );

    return {
      budgetId: Number(budget.id),
      budgetStatus: budget.status,
      lines: rows.map((row) => ({
        sourceLineId: Number(row.sourceLineId),
        code: row.code,
        name: row.name,
        classification: row.classification,
        budgetedAmount: Number(row.budgetedAmount),
        executedAmount: Number(row.executedAmount)
      }))
    };
  }

  async findDraftByBuildingYear(buildingId, year) {
    const budget = await AnnualBudget.findOne({
      where: { buildingId, year, status: 'borrador' },
      include: [{ model: BudgetLine, as: 'lines' }],
      order: [[{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']]
    });
    return budget ? mapBudget(budget) : null;
  }

  async createDraftFromExecution({ buildingId, sourceYear, targetYear, lines, createdBy }) {
    try {
      return await sequelize.transaction(async (transaction) => {
        const budget = await AnnualBudget.create(
          {
            buildingId,
            year: targetYear,
            version: 1,
            status: 'borrador',
            createdBy,
            updatedBy: createdBy
          },
          { transaction }
        );
        await BudgetLine.bulkCreate(
          lines.map((line) => ({ ...line, budgetId: budget.id })),
          { transaction }
        );
        const created = await AnnualBudget.findByPk(budget.id, {
          include: [{ model: BudgetLine, as: 'lines' }],
          order: [[{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']],
          transaction
        });
        return { ...mapBudget(created), sourceYear };
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const conflict = new Error('Ya existe un presupuesto para el año destino.');
        conflict.code = 'BUDGET_ALREADY_EXISTS';
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }
  }
}
