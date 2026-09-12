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
  assetTypeRepository = null
) {
  async function assertValidType(type) {
    if (assetTypeRepository) {
      const found = await assetTypeRepository.findByCode(type);
      if (found) {
        return;
      }
      const catalog = await assetTypeRepository.findAll();
      if (catalog.length > 0) {
        throw new AppError('El tipo de activo no es válido.', 400, 'VALIDATION_ERROR');
      }
    }

    if (!ASSET_TYPES.includes(type)) {
      throw new AppError('El tipo de activo no es válido.', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    async create(buildingId, input, userId = null) {
      const building = await buildingRepository.findById(buildingId);
      if (!building) {
        throw new AppError('El edificio no existe.', 404, 'BUILDING_NOT_FOUND');
      }

      validateCreateInput(input);
      await assertValidType(input.type);
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
      await assertValidType(input.type);
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

    async listTypes() {
      if (!assetTypeRepository) {
        return ASSET_TYPES.map((code) => ({ id: null, code, name: code }));
      }
      const types = await assetTypeRepository.findAll();
      if (types.length > 0) {
        return types;
      }
      return ASSET_TYPES.map((code) => ({ id: null, code, name: code }));
    },

    async createType(input, userId = null) {
      if (!assetTypeRepository) {
        throw new AppError(
          'El repositorio de tipos no está disponible.',
          500,
          'ASSET_TYPE_UNAVAILABLE'
        );
      }
      requiredText(input.code, 'code');
      requiredText(input.name, 'name');
      const code = input.code.trim().toLowerCase();
      const name = input.name.trim();
      if (await assetTypeRepository.findByCode(code)) {
        throw new AppError(
          'Ya existe un tipo de activo con ese código.',
          409,
          'DUPLICATE_ASSET_TYPE'
        );
      }
      return assetTypeRepository.create({ code, name, createdBy: userId });
    },

    async updateType(id, input) {
      if (!assetTypeRepository) {
        throw new AppError(
          'El repositorio de tipos no está disponible.',
          500,
          'ASSET_TYPE_UNAVAILABLE'
        );
      }
      requiredText(input.name, 'name');
      const current = await assetTypeRepository.findById(id);
      if (!current) {
        throw new AppError('El tipo de activo no existe.', 404, 'ASSET_TYPE_NOT_FOUND');
      }
      return assetTypeRepository.update(id, { name: input.name.trim() });
    },

    async deleteType(id) {
      if (!assetTypeRepository) {
        throw new AppError(
          'El repositorio de tipos no está disponible.',
          500,
          'ASSET_TYPE_UNAVAILABLE'
        );
      }
      const current = await assetTypeRepository.findById(id);
      if (!current) {
        throw new AppError('El tipo de activo no existe.', 404, 'ASSET_TYPE_NOT_FOUND');
      }
      if ((await assetTypeRepository.countAssetsByType(current.code)) > 0) {
        throw new AppError(
          'No se puede eliminar un tipo que ya está asignado a un activo.',
          409,
          'ASSET_TYPE_IN_USE'
        );
      }
      await assetTypeRepository.delete(id);
    }
  };
}
