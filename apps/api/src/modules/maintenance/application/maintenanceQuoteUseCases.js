import { AppError } from '../../../shared/errors/AppError.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 9999999999999.99;

function validateInput(input) {
  if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > MAX_AMOUNT) {
    throw new AppError('El valor de la cotización no es válido.', 400, 'VALIDATION_ERROR');
  }
  if (!DATE_PATTERN.test(input.validUntil) || Number.isNaN(Date.parse(input.validUntil))) {
    throw new AppError('La vigencia debe tener el formato YYYY-MM-DD.', 400, 'VALIDATION_ERROR');
  }
  for (const field of ['scope', 'conditions']) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') {
      throw new AppError(`El campo ${field} es obligatorio.`, 400, 'VALIDATION_ERROR');
    }
  }
}

export function createMaintenanceQuoteUseCases(
  quoteRepository,
  maintenanceRepository,
  supplierRepository
) {
  return {
    async list(maintenanceId) {
      if (!(await maintenanceRepository.findById(maintenanceId))) {
        throw new AppError('El mantenimiento no existe.', 404, 'MAINTENANCE_NOT_FOUND');
      }
      return quoteRepository.findByMaintenance(maintenanceId);
    },

    async create(maintenanceId, input, userId = null) {
      const maintenance = await maintenanceRepository.findById(maintenanceId);
      if (!maintenance)
        throw new AppError('El mantenimiento no existe.', 404, 'MAINTENANCE_NOT_FOUND');
      const supplier = await supplierRepository.findById(input.supplierId);
      if (!supplier) throw new AppError('El proveedor no existe.', 404, 'SUPPLIER_NOT_FOUND');
      validateInput(input);
      return quoteRepository.create({
        maintenanceId: Number(maintenanceId),
        supplierId: supplier.id,
        amount: input.amount,
        validUntil: input.validUntil,
        documentRef: input.documentRef?.trim() || null,
        scope: input.scope.trim(),
        conditions: input.conditions.trim(),
        createdBy: userId
      });
    }
  };
}
