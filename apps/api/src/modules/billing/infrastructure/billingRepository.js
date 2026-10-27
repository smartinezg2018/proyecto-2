import { sequelize } from '../../../../database/connection.js';
import { ChargeSchedule, Invoice, InvoiceItem, Unit } from '../../../../database/models/index.js';

function mapInvoice(invoice) {
  const data = invoice.get({ plain: true });
  return {
    id: data.id,
    buildingId: data.buildingId,
    unitId: data.unitId,
    unit: data.unit ? { id: data.unit.id, number: data.unit.number, tower: data.unit.tower } : null,
    period: data.period,
    dueDate: data.dueDate,
    status: data.status,
    paymentReference: data.paymentReference,
    items: (data.items || []).map((item) => ({ id: item.id, concept: item.concept, amount: Number(item.amount) })),
    total: Number(data.total),
    createdBy: data.createdBy
  };
}

export class BillingRepository {
  async createOrdinaryInvoices({ buildingId, period, unitIds, concept, baseAmount, dueDate, createdBy }) {
    const invoices = await sequelize.transaction(async (transaction) => {
      const units = await Unit.findAll({ where: { buildingId, id: unitIds }, transaction });
      if (units.length !== unitIds.length) {
        const error = new Error('Uno o más apartamentos no pertenecen al edificio.');
        error.code = 'UNIT_BUILDING_MISMATCH';
        error.statusCode = 400;
        throw error;
      }

      const created = [];
      for (const unit of units) {
        const amount = Math.round(Number(baseAmount) * Number(unit.coefficient) * 100) / 100;
        const invoice = await Invoice.create(
          {
            buildingId,
            unitId: unit.id,
            period,
            dueDate,
            status: 'pendiente',
            paymentReference: `FAC-${period.replace('-', '')}-${unit.id}`,
            total: amount,
            createdBy,
            updatedBy: createdBy
          },
          { transaction }
        );
        await InvoiceItem.create({ invoiceId: invoice.id, concept, amount }, { transaction });
        created.push(invoice.id);
      }
      return created;
    });

    return this.findByIds(invoices);
  }

  async findByIds(ids) {
    const invoices = await Invoice.findAll({
      where: { id: ids },
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'number', 'tower'] },
        { model: InvoiceItem, as: 'items', attributes: ['id', 'concept', 'amount'] }
      ],
      order: [['id', 'ASC']]
    });
    return invoices.map(mapInvoice);
  }

  async createExtraordinaryCharges({
    buildingId,
    unitIds,
    originPeriod,
    startPeriod,
    concept,
    totalAmount,
    installments,
    approvalReference,
    createdBy
  }) {
    const units = await Unit.findAll({ where: { buildingId, id: unitIds }, attributes: ['id'] });
    if (units.length !== unitIds.length) {
      const error = new Error('Uno o más apartamentos no pertenecen al edificio.');
      error.code = 'UNIT_BUILDING_MISMATCH';
      error.statusCode = 400;
      throw error;
    }

    const installmentAmount = Math.round((Number(totalAmount) / installments) * 100) / 100;
    const schedules = [];
    for (const unit of units) {
      for (let index = 0; index < installments; index += 1) {
        schedules.push({
          buildingId,
          unitId: unit.id,
          chargeType: 'extraordinario',
          originPeriod,
          scheduledPeriod: addMonths(startPeriod, index),
          concept,
          amount: index === installments - 1
            ? Number(totalAmount) - installmentAmount * (installments - 1)
            : installmentAmount,
          approvalReference,
          createdBy
        });
      }
    }
    await ChargeSchedule.bulkCreate(schedules);
    return schedules;
  }
}

function addMonths(period, months) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
