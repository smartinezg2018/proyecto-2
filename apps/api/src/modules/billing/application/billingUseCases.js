import { AppError } from '../../../shared/errors/AppError.js';

function todayInColombia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export function createBillingUseCases(repository, clock = todayInColombia) {
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
      if (mode === 'manual' && (!Array.isArray(input.allocations) || input.allocations.length === 0)) {
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
    }
  };
}
