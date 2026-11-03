import { QueryTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../../../../database/connection.js';
import { AnnualBudget, BudgetExecution, BudgetLine } from '../../../../database/models/index.js';

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

  async nextVersionForBuildingYear(buildingId, year) {
    const latest = await AnnualBudget.findOne({
      where: { buildingId, year },
      order: [['version', 'DESC']]
    });
    return latest ? Number(latest.version) + 1 : 1;
  }

  async createAnnualBudget({ buildingId, year, version, status, lines, createdBy }) {
    return sequelize.transaction(async (transaction) => {
      const budget = await AnnualBudget.create(
        {
          buildingId,
          year,
          version,
          status,
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
      return mapBudget(created);
    });
  }

  async listAnnualBudgets(buildingId, year) {
    const where = { buildingId };
    if (year != null) where.year = year;
    const budgets = await AnnualBudget.findAll({
      where,
      include: [{ model: BudgetLine, as: 'lines' }],
      order: [
        ['year', 'DESC'],
        ['version', 'DESC'],
        [{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']
      ]
    });
    return budgets.map(mapBudget);
  }

  async findAnnualBudgetById(budgetId) {
    const budget = await AnnualBudget.findByPk(budgetId, {
      include: [{ model: BudgetLine, as: 'lines' }],
      order: [[{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']]
    });
    return budget ? mapBudget(budget) : null;
  }

  async updateAnnualBudgetStatus(budgetId, status, updatedBy) {
    const budget = await AnnualBudget.findByPk(budgetId, {
      include: [{ model: BudgetLine, as: 'lines' }],
      order: [[{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']]
    });
    if (!budget) return null;
    await budget.update({ status, updatedBy });
    return mapBudget(budget);
  }

  async findBudgetLineForBuilding(buildingId, budgetLineId) {
    const rows = await sequelize.query(
      `SELECT bl.id,
              bl.code,
              bl.name,
              bl.classification,
              bl.amount AS budgetedAmount,
              ab.building_id AS buildingId,
              ab.year
       FROM budget_lines bl
       INNER JOIN annual_budgets ab ON ab.id = bl.budget_id
       WHERE bl.id = :budgetLineId
         AND ab.building_id = :buildingId
       LIMIT 1`,
      {
        replacements: { budgetLineId, buildingId },
        type: QueryTypes.SELECT
      }
    );
    if (!rows[0]) return null;
    return {
      id: Number(rows[0].id),
      code: rows[0].code,
      name: rows[0].name,
      classification: rows[0].classification,
      budgetedAmount: Number(rows[0].budgetedAmount),
      buildingId: Number(rows[0].buildingId),
      year: Number(rows[0].year)
    };
  }

  async createExecution({ budgetLineId, executionDate, amount, description, createdBy }) {
    const execution = await BudgetExecution.create({
      budgetLineId,
      executionDate,
      amount,
      description,
      createdBy
    });
    const data = execution.get({ plain: true });
    return {
      id: Number(data.id),
      budgetLineId: Number(data.budgetLineId),
      executionDate: data.executionDate,
      amount: Number(data.amount),
      description: data.description,
      createdBy: data.createdBy == null ? null : Number(data.createdBy)
    };
  }

  async getLineBalance(budgetLineId) {
    const rows = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0) AS executedAmount
       FROM budget_executions
       WHERE budget_line_id = :budgetLineId`,
      {
        replacements: { budgetLineId },
        type: QueryTypes.SELECT
      }
    );
    return { executedAmount: Number(rows[0]?.executedAmount || 0) };
  }

  async listBudgetLinesForBuilding(buildingId, year) {
    const rows = await sequelize.query(
      `SELECT bl.id,
              bl.code,
              bl.name,
              bl.classification,
              bl.amount AS budgetedAmount,
              COALESCE(SUM(be.amount), 0) AS executedAmount,
              ab.version,
              ab.status
       FROM annual_budgets ab
       INNER JOIN budget_lines bl ON bl.budget_id = ab.id
       LEFT JOIN budget_executions be ON be.budget_line_id = bl.id
       WHERE ab.id = (
         SELECT selected.id
         FROM annual_budgets selected
         WHERE selected.building_id = :buildingId
           AND selected.year = :year
         ORDER BY
           CASE selected.status
             WHEN 'aprobado' THEN 1
             WHEN 'borrador' THEN 2
             ELSE 3
           END,
           selected.version DESC
         LIMIT 1
       )
       GROUP BY bl.id, bl.code, bl.name, bl.classification, bl.amount, ab.version, ab.status
       ORDER BY bl.code ASC`,
      {
        replacements: { buildingId, year },
        type: QueryTypes.SELECT
      }
    );
    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      classification: row.classification,
      budgetedAmount: Number(row.budgetedAmount),
      executedAmount: Number(row.executedAmount),
      availableAmount: Number(row.budgetedAmount) - Number(row.executedAmount),
      version: Number(row.version),
      status: row.status
    }));
  }
}}
