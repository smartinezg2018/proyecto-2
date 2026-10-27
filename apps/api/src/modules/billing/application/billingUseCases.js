import { AppError } from '../../../shared/errors/AppError.js';

export function createBillingUseCases(repository) {
  return {
    async generateOrdinaryInvoices(input, createdBy) {
      const uniqueUnitIds = [...new Set(input.unitIds)];
      if (uniqueUnitIds.length !== input.unitIds.length) {
        throw new AppError('No puede repetir apartamentos en la misma generación.', 400, 'DUPLICATE_UNITS');
      }

      return repository.createOrdinaryInvoices({ ...input, unitIds: uniqueUnitIds, createdBy });
    },

    async generateExtraordinaryCharges(input, createdBy) {
      const unitIds = [...new Set(input.unitIds)];
      if (unitIds.length !== input.unitIds.length) {
        throw new AppError('No puede repetir apartamentos en el mismo cobro.', 400, 'DUPLICATE_UNITS');
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
        throw new AppError('No puede repetir apartamentos en el mismo cobro.', 400, 'DUPLICATE_UNITS');
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
    }
  };
}
