import { AppError } from '../../../shared/errors/AppError.js';
import { ASSET_COST_TYPES, ASSET_STATUSES, ASSET_TYPES } from '../domain/assetCatalog.js';

export { ASSET_COST_TYPES, ASSET_STATUSES, ASSET_TYPES };

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

function validateDate(
  value,
  message = 'La fecha de adquisición debe tener el formato YYYY-MM-DD.'
) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }
}

function validateAcquisitionDate(value) {
  validateDate(value);
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

function parseNonNegativeNumber(value, fieldName) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(
      `El campo ${fieldName} debe ser numérico y no negativo.`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return amount;
}

function optionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new AppError(
      `El campo ${fieldName} debe tener el formato YYYY-MM-DD.`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return value;
}

export function createAssetUseCases(assetRepository, buildingRepository, costRepository = null) {
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

    async createCost(assetId, input, userId = null) {
      if (!costRepository) {
        throw new AppError('El repositorio de costos no está disponible.', 500, 'COST_UNAVAILABLE');
      }

      await this.getById(assetId);
      if (!ASSET_COST_TYPES.includes(input.type)) {
        throw new AppError(
          'El tipo de intervención no es válido. Use reparacion, mejora o mantenimiento.',
          400,
          'VALIDATION_ERROR'
        );
      }
      validateDate(
        input.occurredOn,
        'La fecha de la intervención debe tener el formato YYYY-MM-DD.'
      );
      optionalText(input.description, 'description');

      return costRepository.create({
        assetId: Number(assetId),
        type: input.type,
        amount: parseNonNegativeNumber(input.amount, 'amount'),
        occurredOn: input.occurredOn,
        description: input.description?.trim() || null,
        createdBy: userId
      });
    },

    async getCosts(assetId, filters = {}) {
      if (!costRepository) {
        return { items: [], total: 0, filters: { type: null, from: null, to: null } };
      }

      await this.getById(assetId);
      const type = filters.type || null;
      if (type && !ASSET_COST_TYPES.includes(type)) {
        throw new AppError(
          'El tipo de intervención no es válido. Use reparacion, mejora o mantenimiento.',
          400,
          'VALIDATION_ERROR'
        );
      }

      const appliedFilters = {
        type,
        from: optionalDate(filters.from, 'from'),
        to: optionalDate(filters.to, 'to')
      };
      const items = await costRepository.findByAsset(assetId, appliedFilters);
      const total = items.reduce((sum, cost) => sum + Number(cost.amount), 0);

      return { items, total, filters: appliedFilters };
    }
  };
}
