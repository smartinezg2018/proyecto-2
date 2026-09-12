import { AppError } from '../../../shared/errors/AppError.js';
import { ASSET_STATUSES, ASSET_TYPES } from '../domain/assetCatalog.js';

export { ASSET_STATUSES, ASSET_TYPES };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function validateAcquisitionDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new AppError(
      'La fecha de adquisición debe tener el formato YYYY-MM-DD.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function validateCreateInput(input) {
  requiredText(input.code, 'code');
  requiredText(input.name, 'name');
  optionalText(input.description, 'description');
  optionalText(input.location, 'location');
  requiredText(input.type, 'type');
  requiredText(input.status, 'status');
  validateAcquisitionDate(input.acquisitionDate);

  if (!ASSET_TYPES.includes(input.type)) {
    throw new AppError('El tipo de activo no es válido.', 400, 'VALIDATION_ERROR');
  }

  if (!ASSET_STATUSES.includes(input.status)) {
    throw new AppError(
      'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function validateUpdateInput(input) {
  requiredText(input.name, 'name');
  optionalText(input.description, 'description');
  optionalText(input.location, 'location');
  requiredText(input.type, 'type');
  validateAcquisitionDate(input.acquisitionDate);

  if (!ASSET_TYPES.includes(input.type)) {
    throw new AppError('El tipo de activo no es válido.', 400, 'VALIDATION_ERROR');
  }
}

function normalizeAssetInput(input, buildingId) {
  return {
    buildingId: Number(buildingId),
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    status: input.status,
    location: input.location?.trim() || null,
    acquisitionDate: input.acquisitionDate
  };
}

function normalizeUpdateInput(input) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    location: input.location?.trim() || null,
    acquisitionDate: input.acquisitionDate
  };
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value);
}

function buildFieldHistory(previous, next, userId) {
  const fields = ['name', 'description', 'type', 'location', 'acquisitionDate'];
  return fields
    .filter((field) => stringifyValue(previous[field]) !== stringifyValue(next[field]))
    .map((field) => ({
      changeType: 'actualizacion',
      field,
      oldValue: stringifyValue(previous[field]),
      newValue: stringifyValue(next[field]),
      reason: null,
      createdBy: userId
    }));
}

export function createAssetUseCases(
  assetRepository,
  buildingRepository,
  providerRepository = null
) {
  return {
    async create(buildingId, input, userId = null) {
      const building = await buildingRepository.findById(buildingId);
      if (!building) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }

      validateCreateInput(input);
      const asset = normalizeAssetInput(input, buildingId);

      if (await assetRepository.findByBuildingAndCode(asset.buildingId, asset.code)) {
        throw new AppError(
          'Ya existe un activo con ese código en el edificio.',
          409,
          'DUPLICATE_ASSET'
        );
      }

      return assetRepository.create({ ...asset, createdBy: userId }, [
        {
          changeType: 'creacion',
          field: 'status',
          oldValue: null,
          newValue: asset.status,
          reason: 'Registro inicial del activo',
          createdBy: userId
        }
      ]);
    },

    async listByBuilding(buildingId) {
      const building = await buildingRepository.findById(buildingId);
      if (!building) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }

      return assetRepository.findAllByBuilding(buildingId);
    },

    async getById(id) {
      const asset = await assetRepository.findById(id);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      return asset;
    },

    async update(id, input, userId = null) {
      validateUpdateInput(input);
      const current = await this.getById(id);
      const changes = normalizeUpdateInput(input);
      const historyEntries = buildFieldHistory(current, changes, userId);

      return assetRepository.update(id, { ...changes, updatedBy: userId }, historyEntries);
    },

    async changeStatus(id, input, userId = null) {
      if (!ASSET_STATUSES.includes(input.status)) {
        throw new AppError(
          'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (typeof input.reason !== 'string' || input.reason.trim() === '') {
        throw new AppError(
          'El motivo del cambio de estado es obligatorio.',
          400,
          'VALIDATION_ERROR'
        );
      }

      const current = await this.getById(id);
      if (current.status === input.status) {
        throw new AppError(
          'El activo ya se encuentra en ese estado.',
          409,
          'UNCHANGED_ASSET_STATUS'
        );
      }

      return assetRepository.updateStatus(id, input.status, userId, [
        {
          changeType: 'cambio_estado',
          field: 'status',
          oldValue: current.status,
          newValue: input.status,
          reason: input.reason.trim(),
          createdBy: userId
        }
      ]);
    },

    async getHistory(id) {
      await this.getById(id);
      return assetRepository.findHistoryByAsset(id);
    },

    async listProviders() {
      if (!providerRepository) {
        return [];
      }
      return providerRepository.findAll();
    },

    async createProvider(input, userId = null) {
      if (!providerRepository) {
        throw new AppError(
          'El repositorio de proveedores no está disponible.',
          500,
          'PROVIDER_UNAVAILABLE'
        );
      }
      requiredText(input.name, 'name');
      optionalText(input.contactName, 'contactName');
      optionalText(input.email, 'email');
      optionalText(input.phone, 'phone');
      optionalText(input.address, 'address');

      const name = input.name.trim();
      if (await providerRepository.findByName(name)) {
        throw new AppError('Ya existe un proveedor con ese nombre.', 409, 'DUPLICATE_PROVIDER');
      }

      return providerRepository.create({
        name,
        contactName: input.contactName?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        createdBy: userId
      });
    },

    async assignProvider(assetId, input, userId = null) {
      if (!providerRepository || !assetRepository.assignProvider) {
        throw new AppError(
          'El repositorio de proveedores no está disponible.',
          500,
          'PROVIDER_UNAVAILABLE'
        );
      }

      const asset = await this.getById(assetId);
      let provider;

      if (input.providerId) {
        provider = await providerRepository.findById(input.providerId);
        if (!provider) {
          throw new AppError('El proveedor no existe.', 404, 'PROVIDER_NOT_FOUND');
        }
      } else {
        provider = await this.createProvider(input, userId);
      }

      const updated = await assetRepository.assignProvider(asset.id, provider.id, userId, [
        {
          changeType: 'actualizacion',
          field: 'providerId',
          oldValue: stringifyValue(asset.providerId),
          newValue: stringifyValue(provider.id),
          reason: 'Asociación de proveedor',
          createdBy: userId
        }
      ]);

      return { ...updated, provider };
    }
  };
}
