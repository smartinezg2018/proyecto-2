import { sequelize } from '../../../../database/connection.js';
import { ChargeSchedule, Invoice, InvoiceItem, Unit } from '../../../../database/models/index.js';
import { QueryTypes } from 'sequelize';

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
    items: (data.items || []).map((item) => ({
      id: item.id,
      concept: item.concept,
      amount: Number(item.amount)
    })),
    total: Number(data.total),
    createdBy: data.createdBy
  };
}

export class BillingRepository {
  async findPortfolio({ buildingId, unitId = null, period = null, status = null, today }) {
    const rows = await sequelize.query(
      `WITH interest_totals AS (
         SELECT invoice_id, SUM(amount) AS interests
         FROM late_interests
         WHERE status <> 'reversado'
         GROUP BY invoice_id
       ),
       payment_totals AS (
         SELECT pa.invoice_id, SUM(pa.amount) AS payments
         FROM payment_allocations pa
         INNER JOIN payments p ON p.id = pa.payment_id
         INNER JOIN invoices payment_invoice
           ON payment_invoice.id = pa.invoice_id
          AND payment_invoice.building_id = p.building_id
          AND payment_invoice.unit_id = p.unit_id
         WHERE p.status <> 'reversado'
         GROUP BY pa.invoice_id
       ),
       invoice_balances AS (
         SELECT i.unit_id AS unitId,
                i.total AS capital,
                COALESCE(interest_totals.interests, 0) AS interests,
                COALESCE(payment_totals.payments, 0) AS payments,
                GREATEST(
                  i.total + COALESCE(interest_totals.interests, 0)
                    - COALESCE(payment_totals.payments, 0),
                  0
                ) AS balance,
                i.due_date AS dueDate
         FROM invoices i
         LEFT JOIN interest_totals ON interest_totals.invoice_id = i.id
         LEFT JOIN payment_totals ON payment_totals.invoice_id = i.id
         WHERE i.building_id = :buildingId
           AND (:period IS NULL OR i.period = :period)
       ),
       portfolio AS (
         SELECT u.id AS unitId,
                u.number AS unitNumber,
                u.tower,
                COALESCE(SUM(invoice_balances.capital), 0) AS capital,
                COALESCE(SUM(invoice_balances.interests), 0) AS interests,
                COALESCE(SUM(invoice_balances.payments), 0) AS payments,
                COALESCE(SUM(invoice_balances.balance), 0) AS totalBalance,
                CASE
                  WHEN COALESCE(SUM(invoice_balances.balance), 0) = 0 THEN 'al_dia'
                  WHEN MAX(
                    CASE
                      WHEN invoice_balances.balance > 0 AND invoice_balances.dueDate < :today THEN 1
                      ELSE 0
                    END
                  ) = 1 THEN 'en_mora'
                  ELSE 'pendiente'
                END AS portfolioStatus
         FROM units u
         LEFT JOIN invoice_balances ON invoice_balances.unitId = u.id
         WHERE u.building_id = :buildingId
           AND u.kind = 'apartamento'
           AND (:unitId IS NULL OR u.id = :unitId)
         GROUP BY u.id, u.number, u.tower
       )
       SELECT unitId, unitNumber, tower, capital, interests, payments, totalBalance,
              portfolioStatus AS status
       FROM portfolio
       WHERE (:status IS NULL OR portfolioStatus = :status)
       ORDER BY tower ASC, unitNumber ASC`,
      {
        replacements: { buildingId: Number(buildingId), unitId, period, status, today },
        type: QueryTypes.SELECT
      }
    );

    return rows.map((row) => ({
      unitId: Number(row.unitId),
      unitNumber: row.unitNumber,
      tower: row.tower,
      capital: Number(row.capital),
      interests: Number(row.interests),
      payments: Number(row.payments),
      totalBalance: Number(row.totalBalance),
      status: row.status
    }));
  }

  async findInvoiceHistory({ buildingId, unitId, period = null, status = null }) {
    const rows = await sequelize.query(
      `WITH interest_totals AS (
         SELECT invoice_id, SUM(amount) AS interests
         FROM late_interests
         WHERE status <> 'reversado'
         GROUP BY invoice_id
       ),
       payment_totals AS (
         SELECT pa.invoice_id, SUM(pa.amount) AS appliedPayments
         FROM payment_allocations pa
         INNER JOIN payments p ON p.id = pa.payment_id
         INNER JOIN invoices payment_invoice
           ON payment_invoice.id = pa.invoice_id
          AND payment_invoice.building_id = p.building_id
          AND payment_invoice.unit_id = p.unit_id
         WHERE p.status <> 'reversado'
         GROUP BY pa.invoice_id
       )
       SELECT i.id,
              i.unit_id AS unitId,
              u.number AS unitNumber,
              u.tower,
              i.period,
              i.due_date AS dueDate,
              i.status,
              i.payment_reference AS paymentReference,
              i.total,
              COALESCE(interest_totals.interests, 0) AS interests,
              COALESCE(payment_totals.appliedPayments, 0) AS appliedPayments,
              GREATEST(
                i.total + COALESCE(interest_totals.interests, 0)
                  - COALESCE(payment_totals.appliedPayments, 0),
                0
              ) AS balance
       FROM invoices i
       INNER JOIN units u
         ON u.id = i.unit_id
        AND u.building_id = i.building_id
       LEFT JOIN interest_totals ON interest_totals.invoice_id = i.id
       LEFT JOIN payment_totals ON payment_totals.invoice_id = i.id
       WHERE i.building_id = :buildingId
         AND i.unit_id = :unitId
         AND (:period IS NULL OR i.period = :period)
         AND (:status IS NULL OR i.status = :status)
       ORDER BY i.period DESC, i.id DESC`,
      {
        replacements: { buildingId: Number(buildingId), unitId, period, status },
        type: QueryTypes.SELECT
      }
    );

    return rows.map(mapInvoiceSummary);
  }

  async findInvoiceDetail({ buildingId, invoiceId }) {
    const rows = await sequelize.query(
      `WITH interest_totals AS (
         SELECT invoice_id, SUM(amount) AS interests
         FROM late_interests
         WHERE status <> 'reversado'
         GROUP BY invoice_id
       ),
       payment_totals AS (
         SELECT pa.invoice_id, SUM(pa.amount) AS appliedPayments
         FROM payment_allocations pa
         INNER JOIN payments p ON p.id = pa.payment_id
         INNER JOIN invoices payment_invoice
           ON payment_invoice.id = pa.invoice_id
          AND payment_invoice.building_id = p.building_id
          AND payment_invoice.unit_id = p.unit_id
         WHERE p.status <> 'reversado'
         GROUP BY pa.invoice_id
       )
       SELECT i.id,
              i.unit_id AS unitId,
              u.number AS unitNumber,
              u.tower,
              i.period,
              i.due_date AS dueDate,
              i.status,
              i.payment_reference AS paymentReference,
              i.total,
              COALESCE(interest_totals.interests, 0) AS interests,
              COALESCE(payment_totals.appliedPayments, 0) AS appliedPayments,
              GREATEST(
                i.total + COALESCE(interest_totals.interests, 0)
                  - COALESCE(payment_totals.appliedPayments, 0),
                0
              ) AS balance
       FROM invoices i
       INNER JOIN units u
         ON u.id = i.unit_id
        AND u.building_id = i.building_id
       LEFT JOIN interest_totals ON interest_totals.invoice_id = i.id
       LEFT JOIN payment_totals ON payment_totals.invoice_id = i.id
       WHERE i.building_id = :buildingId
         AND i.id = :invoiceId`,
      {
        replacements: { buildingId: Number(buildingId), invoiceId: Number(invoiceId) },
        type: QueryTypes.SELECT
      }
    );
    if (rows.length === 0) return null;

    const [items, payments, interests] = await Promise.all([
      sequelize.query(
        `SELECT id, concept, amount
         FROM invoice_items
         WHERE invoice_id = :invoiceId
         ORDER BY id ASC`,
        { replacements: { invoiceId: Number(invoiceId) }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT p.id,
                p.payment_date AS paymentDate,
                p.payment_method AS paymentMethod,
                p.reference,
                p.status,
                pa.amount
         FROM payment_allocations pa
         INNER JOIN payments p ON p.id = pa.payment_id
         WHERE pa.invoice_id = :invoiceId
           AND p.building_id = :buildingId
           AND p.unit_id = :unitId
         ORDER BY p.payment_date DESC, p.id DESC`,
        {
          replacements: {
            invoiceId: Number(invoiceId),
            buildingId: Number(buildingId),
            unitId: Number(rows[0].unitId)
          },
          type: QueryTypes.SELECT
        }
      ),
      sequelize.query(
        `SELECT id, calculation_date AS calculationDate, amount, status
         FROM late_interests
         WHERE invoice_id = :invoiceId
         ORDER BY calculation_date DESC, id DESC`,
        { replacements: { invoiceId: Number(invoiceId) }, type: QueryTypes.SELECT }
      )
    ]);

    return {
      ...mapInvoiceSummary(rows[0]),
      items: items.map((item) => ({ ...item, id: Number(item.id), amount: Number(item.amount) })),
      payments: payments.map((payment) => ({
        ...payment,
        id: Number(payment.id),
        amount: Number(payment.amount)
      })),
      interestEntries: interests.map((interest) => ({
        ...interest,
        id: Number(interest.id),
        amount: Number(interest.amount)
      }))
    };
  }

  async createOrdinaryInvoices({
    buildingId,
    period,
    unitIds,
    concept,
    baseAmount,
    dueDate,
    createdBy
  }) {
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

  async findPaymentSlip(invoiceId) {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'number', 'tower'] },
        { model: InvoiceItem, as: 'items', attributes: ['id', 'concept', 'amount'] }
      ]
    });
    return invoice ? mapInvoice(invoice) : null;
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
          amount:
            index === installments - 1
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

  async createRetroactiveCharges({
    buildingId,
    unitIds,
    originPeriod,
    startPeriod,
    concept,
    totalAmount,
    installments,
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
    const schedules = units.flatMap((unit) =>
      Array.from({ length: installments }, (_, index) => ({
        buildingId,
        unitId: unit.id,
        chargeType: 'retroactivo',
        originPeriod,
        scheduledPeriod: addMonths(startPeriod, index),
        concept,
        amount:
          index === installments - 1
            ? Number(totalAmount) - installmentAmount * (installments - 1)
            : installmentAmount,
        createdBy
      }))
    );
    await ChargeSchedule.bulkCreate(schedules);
    return schedules;
  }
}

function mapInvoiceSummary(row) {
  return {
    id: Number(row.id),
    unitId: Number(row.unitId),
    unitNumber: row.unitNumber,
    tower: row.tower,
    period: row.period,
    dueDate: row.dueDate,
    status: row.status,
    paymentReference: row.paymentReference,
    total: Number(row.total),
    interests: Number(row.interests),
    appliedPayments: Number(row.appliedPayments),
    balance: Number(row.balance)
  };
}

function addMonths(period, months) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
