import { AppError } from '../../../shared/errors/AppError.js';
import { SUPPLIER_ROLES } from '../domain/assetCatalog.js';

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`El campo ${fieldName} es obligatorio.`, 400, 'VALIDATION_ERROR');
  }
}

function optionalText(value, fieldName) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new AppError(`El campo ${fieldName} debe ser texto.`, 400, 'VALIDATION_ERROR');
  }
}

function validateSupplierFields(input) {
  requiredText(input.identification, 'identification');
  requiredText(input.name, 'name');
  optionalText(input.phone, 'phone');
  optionalText(input.email, 'email');
}

function normalizeSupplierFields(input) {
  return {
    identification: input.identification.trim(),
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null
  };
}

function resolveRole(role) {
  const value = role || 'suministro';
  if (!SUPPLIER_ROLES.includes(value)) {
    throw new AppError(
      'El rol del proveedor no es válido. Use suministro o soporte.',
      400,
      'VALIDATION_ERROR'
    );
  }
  return value;
}

export function createSupplierUseCases(supplierRepository, assetRepository, audit = null) {
  return {
    async list() {
      return supplierRepository.findAll();
    },

    async create(input, userId = null) {
      validateSupplierFields(input);
      const supplierInput = normalizeSupplierFields(input);

      if (await supplierRepository.findByIdentification(supplierInput.identification)) {
        throw new AppError(
          'Ya existe un proveedor con esa identificación.',
          409,
          'DUPLICATE_SUPPLIER'
        );
      }

      const created = await supplierRepository.create({ ...supplierInput, createdBy: userId });
      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'assets',
          entity: 'supplier',
          entityId: created.id,
          buildingId: null,
          metadata: {
            identification: created.identification,
            name: created.name
          }
        });
      }

      return created;
    },

    async getByAsset(assetId) {
      const asset = await assetRepository.findById(assetId);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      return supplierRepository.findByAsset(assetId);
    },

    async assignToAsset(assetId, input, userId = null) {
      const asset = await assetRepository.findById(assetId);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      const role = resolveRole(input.role);
      let supplier = null;
      let wasCreated = false;

      if (input.supplierId !== undefined && input.supplierId !== null && input.supplierId !== '') {
        supplier = await supplierRepository.findById(input.supplierId);
        if (!supplier) {
          throw new AppError('El proveedor no existe.', 404, 'SUPPLIER_NOT_FOUND');
        }
      } else {
        validateSupplierFields(input);
        const supplierInput = normalizeSupplierFields(input);
        supplier = await supplierRepository.findByIdentification(supplierInput.identification);
        if (!supplier) {
          supplier = await supplierRepository.create({ ...supplierInput, createdBy: userId });
          wasCreated = true;
        }
      }

      await supplierRepository.assignToAsset(assetId, supplier.id, role, userId);
      const assigned = await supplierRepository.findByAsset(assetId);

      if (audit) {
        await audit.record({
          userId,
          action: wasCreated ? 'create' : 'update',
          module: 'assets',
          entity: 'asset_supplier',
          entityId: asset.id,
          buildingId: asset.buildingId,
          metadata: {
            assetId: asset.id,
            supplierId: supplier.id,
            role,
            identification: supplier.identification,
            name: supplier.name
          }
        });
      }

      return assigned;
    }
  };
}
