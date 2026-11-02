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
  async findDraftByBuildingYear(buildingId, year) {
    const budget = await AnnualBudget.findOne({
      where: { buildingId, year, status: 'borrador' },
      include: [{ model: BudgetLine, as: 'lines' }],
      order: [[{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']]
    });
    return budget ? mapBudget(budget) : null;
  }

  async ensureDraftBudget({ buildingId, year, lines, createdBy }) {
    const existing = await this.findDraftByBuildingYear(buildingId, year);
    if (existing) return existing;

    const created = await AnnualBudget.create({
      buildingId,
      year,
      version: 1,
      status: 'borrador',
      createdBy,
      updatedBy: createdBy
    });

    if (lines?.length) {
      await BudgetLine.bulkCreate(
        lines.map((line) => ({
          budgetId: created.id,
          code: line.code,
          name: line.name,
          classification: line.classification,
          amount: line.amount
        }))
      );
    }

    return this.findDraftByBuildingYear(buildingId, year);
  }

  async applyLineAmounts({ budgetId, updates, updatedBy }) {
    for (const update of updates) {
      await BudgetLine.update(
        { amount: update.amount },
        { where: { id: update.lineId, budgetId } }
      );
    }
    await AnnualBudget.update({ updatedBy }, { where: { id: budgetId } });
    const budget = await AnnualBudget.findByPk(budgetId, {
      include: [{ model: BudgetLine, as: 'lines' }],
      order: [[{ model: BudgetLine, as: 'lines' }, 'code', 'ASC']]
    });
    return mapBudget(budget);
  }
}
