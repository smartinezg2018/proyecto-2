import { AppError } from '../../../shared/errors/AppError.js';

export function createBillingUseCases(repository) {
  return {
    async generateOrdinaryInvoices(input, createdBy) {
      const uniqueUnitIds = [...new Set(input.unitIds)];
      if (uniqueUnitIds.length !== input.unitIds.length) {
        throw new AppError('No puede repetir apartamentos en la misma generación.', 400, 'DUPLICATE_UNITS');
      }

      return repository.createOrdinaryInvoices({ ...input, unitIds: uniqueUnitIds, createdBy });
    }
  };
}
