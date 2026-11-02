import { AppError } from '../../../shared/errors/AppError.js';

function todayInColombia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

function daysBetween(from, to) {
  return Math.max(
    0,
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
  );
}

export function calculateLateInterest(invoice, annualRate, calculationDate) {
  const overdueDays = daysBetween(invoice.dueDate, calculationDate);
  let balance = Number(invoice.total);
  let weightedCapitalDays = 0;
  let cursor = invoice.dueDate;

  for (const payment of invoice.payments) {
    if (payment.paymentDate <= invoice.dueDate) {
      balance = Math.max(balance - Number(payment.amount), 0);
      continue;
    }
    if (payment.paymentDate > calculationDate) break;

    weightedCapitalDays += balance * daysBetween(cursor, payment.paymentDate);
    balance = Math.max(balance - Number(payment.amount), 0);
    cursor = payment.paymentDate;
  }
  weightedCapitalDays += balance * daysBetween(cursor, calculationDate);

  return {
    invoiceId: invoice.id,
    overdueDays,
    capitalBalance: balance,
    amount:
      Math.round((weightedCapitalDays * (Number(annualRate) / 100 / 365) + Number.EPSILON) * 100) /
      100
  };
}

export function createBillingUseCases(repository, clock = todayInColombia) {
  async function recalculateLateInterests(buildingId, createdBy) {
    const numericBuildingId = Number(buildingId);
    const calculationDate = clock();
    const settings = await repository.findInterestSettings(numericBuildingId);
    const invoices = await repository.findInvoicesForInterest({
      buildingId: numericBuildingId,
      calculationDate
    });
    const calculations = invoices.map((invoice) =>
      calculateLateInterest(invoice, settings.annualRate, calculationDate)
    );
    await repository.replaceLateInterests({ calculations, calculationDate, createdBy });
    return {
      calculationDate,
      annualRate: settings.annualRate,
      processed: calculations.length,
      invoices: calculations
    };
  }

  return {
    async listPortfolio(buildingId, filters = {}) {
      return repository.findPortfolio({
        buildingId: Number(buildingId),
        ...filters,
        today: clock()
      });
    },

    async listInvoiceHistory(buildingId, filters) {
      return repository.findInvoiceHistory({
        buildingId: Number(buildingId),
        ...filters
      });
    },

    async getInvoiceDetail(buildingId, invoiceId) {
      const invoice = await repository.findInvoiceDetail({
        buildingId: Number(buildingId),
        invoiceId: Number(invoiceId)
      });
      if (!invoice) {
        throw new AppError('La factura no existe.', 404, 'INVOICE_NOT_FOUND');
      }
      return invoice;
    },

    async getInterestSettings(buildingId) {
      return repository.findInterestSettings(Number(buildingId));
    },

    async saveInterestSettings(buildingId, annualRate, updatedBy) {
      const settings = await repository.upsertInterestSettings({
        buildingId: Number(buildingId),
        annualRate: Number(annualRate),
        updatedBy
      });
      const calculation = await recalculateLateInterests(buildingId, updatedBy);
      return { settings, calculation };
    },

    recalculateLateInterests,

    async generateOrdinaryInvoices(input, createdBy) {
      const uniqueUnitIds = [...new Set(input.unitIds)];
      if (uniqueUnitIds.length !== input.unitIds.length) {
        throw new AppError(
          'No puede repetir apartamentos en la misma generación.',
          400,
          'DUPLICATE_UNITS'
        );
      }

      return repository.createOrdinaryInvoices({ ...input, unitIds: uniqueUnitIds, createdBy });
    },

    async generateExtraordinaryCharges(input, createdBy) {
      const unitIds = [...new Set(input.unitIds)];
      if (unitIds.length !== input.unitIds.length) {
        throw new AppError(
          'No puede repetir apartamentos en el mismo cobro.',
          400,
          'DUPLICATE_UNITS'
        );
      }
      if (input.startPeriod < input.originPeriod) {
        throw new AppError(
          'El periodo inicial no puede ser anterior al periodo de origen.',
          400,
          'INVALID_CHARGE_PERIOD'
        );
      }
      return repository.createExtraordinaryCharges({ ...input, unitIds, createdBy });
    },

    async generateRetroactiveCharges(input, createdBy) {
      const unitIds = [...new Set(input.unitIds)];
      if (unitIds.length !== input.unitIds.length) {
        throw new AppError(
          'No puede repetir apartamentos en el mismo cobro.',
          400,
          'DUPLICATE_UNITS'
        );
      }
      if (input.startPeriod < input.originPeriod) {
        throw new AppError(
          'El periodo inicial no puede ser anterior al periodo de origen.',
          400,
          'INVALID_CHARGE_PERIOD'
        );
      }
      return repository.createRetroactiveCharges({ ...input, unitIds, createdBy });
    },

    async generatePaymentSlip(invoiceId) {
      const slip = await repository.findPaymentSlip(invoiceId);
      if (!slip) {
        throw new AppError('La factura no existe.', 404, 'INVOICE_NOT_FOUND');
      }
      return slip;
    },

    async registerPayment(input, createdBy) {
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError('El valor del pago debe ser mayor a cero.', 400, 'VALIDATION_ERROR');
      }

      return repository.createPayment({
        buildingId: Number(input.buildingId),
        unitId: Number(input.unitId),
        paymentDate: input.paymentDate,
        amount,
        paymentMethod: String(input.paymentMethod).trim(),
        reference: String(input.reference).trim(),
        createdBy
      });
    },

    async applyPayment(buildingId, paymentId, input, updatedBy = null) {
      const mode = input.mode;
      if (mode !== 'auto' && mode !== 'manual') {
        throw new AppError('El modo de aplicación no es válido.', 400, 'VALIDATION_ERROR');
      }
      if (
        mode === 'manual' &&
        (!Array.isArray(input.allocations) || input.allocations.length === 0)
      ) {
        throw new AppError(
          'Debe indicar al menos una factura para la aplicación manual.',
          400,
          'VALIDATION_ERROR'
        );
      }

      return repository.applyPayment({
        buildingId: Number(buildingId),
        paymentId: Number(paymentId),
        mode,
        allocations: mode === 'manual' ? input.allocations : [],
        updatedBy
      });
    },

    async syncInvoiceStatusesAfterPaymentChange(buildingId, paymentId, updatedBy = null) {
      return repository.syncInvoiceStatusesForPayment({
        buildingId: Number(buildingId),
        paymentId: Number(paymentId),
        updatedBy
      });
    },

    async getCashReceipt(buildingId, paymentId) {
      const receipt = await repository.findCashReceiptDetail({
        buildingId: Number(buildingId),
        paymentId: Number(paymentId)
      });
      if (!receipt) {
        throw new AppError(
          'No existe un recibo de caja para el pago indicado.',
          404,
          'CASH_RECEIPT_NOT_FOUND'
        );
      }
      return receipt;
    }
  };
}
