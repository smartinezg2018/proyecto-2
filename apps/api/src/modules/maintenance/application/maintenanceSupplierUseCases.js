import { AppError } from '../../../shared/errors/AppError.js';

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`El campo ${fieldName} es obligatorio.`, 400, 'VALIDATION_ERROR');
  }
}

function normalizeSupplier(input) {
  requiredText(input.identification, 'identification');
  requiredText(input.name, 'name');
  return {
    identification: input.identification.trim(),
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null
  };
}

export function createMaintenanceSupplierUseCases(
  maintenanceRepository,
  supplierRepository,
  audit = null
) {
  return {
    async get(maintenanceId) {
      const maintenance = await maintenanceRepository.findById(maintenanceId);
      if (!maintenance) {
        throw new AppError('El mantenimiento no existe.', 404, 'MAINTENANCE_NOT_FOUND');
      }
      return maintenance.supplier;
    },

    async assign(maintenanceId, input, userId = null) {
      const maintenance = await maintenanceRepository.findById(maintenanceId);
      if (!maintenance) {
        throw new AppError('El mantenimiento no existe.', 404, 'MAINTENANCE_NOT_FOUND');
      }

      let supplier;
      let wasCreated = false;
      if (input.supplierId) {
        supplier = await supplierRepository.findById(input.supplierId);
        if (!supplier) {
          throw new AppError('El proveedor no existe.', 404, 'SUPPLIER_NOT_FOUND');
        }
      } else {
        const supplierInput = normalizeSupplier(input);
        supplier = await supplierRepository.findByIdentification(supplierInput.identification);
        if (!supplier) {
          supplier = await supplierRepository.create({ ...supplierInput, createdBy: userId });
          wasCreated = true;
        }
      }

      const updated = await maintenanceRepository.updateSupplier(
        maintenanceId,
        supplier.id,
        input.documentRef?.trim() || null,
        userId
      );

      if (audit) {
        await audit.record({
          userId,
          action: wasCreated ? 'create' : 'update',
          module: 'maintenance',
          entity: 'maintenance_supplier',
          entityId: maintenanceId,
          buildingId: maintenance.buildingId,
          metadata: { maintenanceId, supplierId: supplier.id }
        });
      }

      return updated.supplier;
    }
  };
}