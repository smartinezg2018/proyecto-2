import { sequelize } from '../../../../database/connection.js';
import {
  ChargeSchedule,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentAllocation,
  Unit
} from '../../../../database/models/index.js';
import { QueryTypes } from 'sequelize';

function mapPayment(payment) {
  const data = payment.get ? payment.get({ plain: true }) : payment;
  return {
    id: Number(data.id),
    buildingId: Number(data.buildingId),
    unitId: Number(data.unitId),
    unit: data.unit
      ? { id: Number(data.unit.id), number: data.unit.number, tower: data.unit.tower }
      : null,
    paymentDate: data.paymentDate,
    amount: Number(data.amount),
    paymentMethod: data.paymentMethod,
    reference: data.reference,
    status: data.status,
    creditBalance: Number(data.creditBalance ?? 0),
    allocations: (data.allocations || []).map((allocation) => ({
      id: Number(allocation.id),
      invoiceId: Number(allocation.invoiceId),
      amount: Number(allocation.amount)
    })),
    createdBy: data.createdBy == null ? null : Number(data.createdBy)
  };
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

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

  async createPayment({
    buildingId,
    unitId,
    paymentDate,
    amount,
    paymentMethod,
    reference,
    createdBy
  }) {
    try {
      const payment = await sequelize.transaction(async (transaction) => {
        const unit = await Unit.findOne({
          where: { id: unitId, buildingId, kind: 'apartamento' },
          transaction
        });
        if (!unit) {
          const error = new Error('El apartamento no pertenece al edificio indicado.');
          error.code = 'UNIT_BUILDING_MISMATCH';
          error.statusCode = 400;
          throw error;
        }

        return Payment.create(
          {
            buildingId,
            unitId,
            paymentDate,
            amount,
            paymentMethod,
            reference,
            status: 'registrado',
            createdBy
          },
          { transaction }
        );
      });

      return this.findPaymentById(payment.id);
    } catch (error) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        const duplicate = new Error('Ya existe un pago con la misma referencia en el edificio.');
        duplicate.code = 'DUPLICATE_PAYMENT_REFERENCE';
        duplicate.statusCode = 409;
        throw duplicate;
      }
      throw error;
    }
  }

  async findPaymentById(paymentId) {
    const payment = await Payment.findByPk(paymentId, {
      include: [
        { model: Unit, as: 'unit', attributes: ['id', 'number', 'tower'] },
        { model: PaymentAllocation, as: 'allocations', attributes: ['id', 'invoiceId', 'amount'] }
      ]
    });
    return payment ? mapPayment(payment) : null;
  }

  async findOpenInvoiceBalances({ buildingId, unitId, invoiceIds = null, transaction }) {
    const rows = await sequelize.query(
      `SELECT i.id AS invoiceId,
              i.period,
              i.due_date AS dueDate,
              i.total AS capital,
              COALESCE(interest_totals.interests, 0) AS interests,
              COALESCE(payment_totals.payments, 0) AS payments,
              GREATEST(
                i.total + COALESCE(interest_totals.interests, 0)
                  - COALESCE(payment_totals.payments, 0),
                0
              ) AS balance
       FROM invoices i
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS interests
         FROM late_interests
         WHERE status <> 'reversado'
         GROUP BY invoice_id
       ) interest_totals ON interest_totals.invoice_id = i.id
       LEFT JOIN (
         SELECT pa.invoice_id, SUM(pa.amount) AS payments
         FROM payment_allocations pa
         INNER JOIN payments p ON p.id = pa.payment_id
         WHERE p.status <> 'reversado'
         GROUP BY pa.invoice_id
       ) payment_totals ON payment_totals.invoice_id = i.id
       WHERE i.building_id = :buildingId
         AND i.unit_id = :unitId
         AND (:hasInvoiceIds = 0 OR i.id IN (:invoiceIds))
       ORDER BY i.due_date ASC, i.id ASC`,
      {
        replacements: {
          buildingId: Number(buildingId),
          unitId: Number(unitId),
          hasInvoiceIds: invoiceIds?.length ? 1 : 0,
          invoiceIds: invoiceIds?.length ? invoiceIds : [0]
        },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    return rows.map((row) => ({
      invoiceId: Number(row.invoiceId),
      period: row.period,
      dueDate: row.dueDate,
      capital: Number(row.capital),
      interests: Number(row.interests),
      payments: Number(row.payments),
      balance: Number(row.balance)
    }));
  }

  async applyPayment({ buildingId, paymentId, mode, allocations = [], updatedBy = null }) {
    return sequelize.transaction(async (transaction) => {
      const payment = await Payment.findOne({
        where: { id: paymentId, buildingId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!payment) {
        const error = new Error('El pago no existe en el edificio indicado.');
        error.code = 'PAYMENT_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      if (payment.status !== 'registrado') {
        const error = new Error('Solo se pueden aplicar pagos en estado registrado.');
        error.code = 'PAYMENT_NOT_APPLICABLE';
        error.statusCode = 409;
        throw error;
      }

      const available = roundMoney(payment.amount);
      let planned = [];

      if (mode === 'auto') {
        const openInvoices = await this.findOpenInvoiceBalances({
          buildingId,
          unitId: payment.unitId,
          transaction
        });
        let remaining = available;
        for (const invoice of openInvoices) {
          if (remaining <= 0) break;
          const balance = roundMoney(invoice.balance);
          if (balance <= 0) continue;
          const applied = roundMoney(Math.min(remaining, balance));
          planned.push({ invoiceId: invoice.invoiceId, amount: applied });
          remaining = roundMoney(remaining - applied);
        }
      } else {
        const invoiceIds = [...new Set(allocations.map((item) => Number(item.invoiceId)))];
        if (invoiceIds.length !== allocations.length) {
          const error = new Error('No puede repetir facturas en la misma aplicación.');
          error.code = 'DUPLICATE_INVOICE_ALLOCATION';
          error.statusCode = 400;
          throw error;
        }

        const openInvoices = await this.findOpenInvoiceBalances({
          buildingId,
          unitId: payment.unitId,
          invoiceIds,
          transaction
        });
        const balances = new Map(openInvoices.map((invoice) => [invoice.invoiceId, invoice]));

        planned = allocations.map((item) => {
          const invoiceId = Number(item.invoiceId);
          const amount = roundMoney(item.amount);
          const invoice = balances.get(invoiceId);
          if (!invoice) {
            const error = new Error(
              'Una o más facturas no pertenecen al edificio y apartamento del pago.'
            );
            error.code = 'INVOICE_PAYMENT_MISMATCH';
            error.statusCode = 400;
            throw error;
          }
          if (amount <= 0) {
            const error = new Error('Cada aplicación debe ser mayor a cero.');
            error.code = 'VALIDATION_ERROR';
            error.statusCode = 400;
            throw error;
          }
          if (amount - roundMoney(invoice.balance) > 0.0001) {
            const error = new Error('No puede aplicar un valor mayor al saldo de la factura.');
            error.code = 'ALLOCATION_EXCEEDS_BALANCE';
            error.statusCode = 400;
            throw error;
          }
          return { invoiceId, amount };
        });
      }

      const appliedTotal = roundMoney(planned.reduce((sum, item) => sum + item.amount, 0));
      if (appliedTotal - available > 0.0001) {
        const error = new Error('El valor aplicado supera el monto del pago.');
        error.code = 'ALLOCATION_EXCEEDS_PAYMENT';
        error.statusCode = 400;
        throw error;
      }

      if (planned.length > 0) {
        await PaymentAllocation.bulkCreate(
          planned.map((item) => ({
            paymentId: payment.id,
            invoiceId: item.invoiceId,
            amount: item.amount
          })),
          { transaction }
        );
      }

      const creditBalance = roundMoney(available - appliedTotal);
      await payment.update({ status: 'aplicado', creditBalance }, { transaction });

      const affectedInvoiceIds = planned.map((item) => item.invoiceId);
      const invoiceStatuses = await this.syncInvoiceStatuses({
        invoiceIds: affectedInvoiceIds,
        updatedBy,
        transaction
      });

      const updated = await Payment.findByPk(payment.id, {
        include: [
          { model: Unit, as: 'unit', attributes: ['id', 'number', 'tower'] },
          { model: PaymentAllocation, as: 'allocations', attributes: ['id', 'invoiceId', 'amount'] }
        ],
        transaction
      });
      return {
        ...mapPayment(updated),
        invoiceStatuses
      };
    });
  }

  resolveInvoiceStatus({ balance, appliedPayments }) {
    if (roundMoney(balance) <= 0) return 'pagada';
    if (roundMoney(appliedPayments) > 0) return 'parcialmente_pagada';
    return 'pendiente';
  }

  async syncInvoiceStatuses({ invoiceIds, updatedBy = null, transaction = null }) {
    const uniqueIds = [...new Set((invoiceIds || []).map(Number).filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const rows = await sequelize.query(
      `SELECT i.id AS invoiceId,
              i.status AS currentStatus,
              i.total AS capital,
              COALESCE(interest_totals.interests, 0) AS interests,
              COALESCE(payment_totals.payments, 0) AS payments,
              GREATEST(
                i.total + COALESCE(interest_totals.interests, 0)
                  - COALESCE(payment_totals.payments, 0),
                0
              ) AS balance
       FROM invoices i
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS interests
         FROM late_interests
         WHERE status <> 'reversado'
         GROUP BY invoice_id
       ) interest_totals ON interest_totals.invoice_id = i.id
       LEFT JOIN (
         SELECT pa.invoice_id, SUM(pa.amount) AS payments
         FROM payment_allocations pa
         INNER JOIN payments p ON p.id = pa.payment_id
         WHERE p.status <> 'reversado'
         GROUP BY pa.invoice_id
       ) payment_totals ON payment_totals.invoice_id = i.id
       WHERE i.id IN (:invoiceIds)`,
      {
        replacements: { invoiceIds: uniqueIds },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    const updates = [];
    for (const row of rows) {
      const balance = roundMoney(row.balance);
      const appliedPayments = roundMoney(row.payments);
      const status = this.resolveInvoiceStatus({ balance, appliedPayments });
      if (status !== row.currentStatus) {
        await Invoice.update(
          { status, updatedBy },
          { where: { id: Number(row.invoiceId) }, transaction }
        );
      }
      updates.push({
        invoiceId: Number(row.invoiceId),
        status,
        balance,
        appliedPayments,
        capital: Number(row.capital),
        interests: Number(row.interests)
      });
    }
    return updates;
  }

  async syncInvoiceStatusesForPayment({ buildingId, paymentId, updatedBy = null }) {
    return sequelize.transaction(async (transaction) => {
      const payment = await Payment.findOne({
        where: { id: paymentId, buildingId },
        include: [
          { model: PaymentAllocation, as: 'allocations', attributes: ['invoiceId'] }
        ],
        transaction
      });
      if (!payment) {
        const error = new Error('El pago no existe en el edificio indicado.');
        error.code = 'PAYMENT_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }

      const invoiceIds = (payment.allocations || []).map((item) => Number(item.invoiceId));
      return this.syncInvoiceStatuses({ invoiceIds, updatedBy, transaction });
    });
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
