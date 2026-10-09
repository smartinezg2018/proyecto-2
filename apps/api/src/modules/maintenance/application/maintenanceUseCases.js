import { AppError } from '../../../shared/errors/AppError.js';
import { MAINTENANCE_TYPES } from '../domain/maintenanceCatalog.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_REASON_MAX_LENGTH = 255;

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateRegisterInput(input) {
  if (!MAINTENANCE_TYPES.includes(input.maintenanceType)) {
    throw new AppError(
      'El tipo de mantenimiento debe ser preventivo o correctivo.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const date = input.maintenanceDate;
  if (typeof date !== 'string' || !DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) {
    throw new AppError(
      'La fecha del mantenimiento debe tener el formato YYYY-MM-DD.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (date > todayString()) {
    throw new AppError('La fecha del mantenimiento no puede ser futura.', 400, 'VALIDATION_ERROR');
  }

  if (typeof input.description !== 'string' || input.description.trim() === '') {
    throw new AppError('La descripción del mantenimiento es obligatoria.', 400, 'VALIDATION_ERROR');
  }
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export function createMaintenanceUseCases(maintenanceRepository, assetRepository, audit = null) {
  async function getAsset(assetId) {
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
    }
    return asset;
  }

  return {
    async register(assetId, input, userId = null) {
      const asset = await getAsset(assetId);

      if (asset.status === 'retirado') {
        throw new AppError(
          'No se pueden registrar mantenimientos sobre un activo retirado.',
          409,
          'ASSET_RETIRED'
        );
      }

      validateRegisterInput(input);
      const description = input.description.trim();

      const saved = await maintenanceRepository.create(
        {
          assetId: asset.id,
          buildingId: asset.buildingId,
          maintenanceType: input.maintenanceType,
          maintenanceDate: input.maintenanceDate,
          description,
          createdBy: userId
        },
        {
          changeType: 'mantenimiento',
          field: null,
          oldValue: null,
          newValue: input.maintenanceType,
          reason: truncate(description, HISTORY_REASON_MAX_LENGTH),
          createdBy: userId
        }
      );

      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'maintenance',
          entity: 'maintenance',
          entityId: saved.id,
          buildingId: asset.buildingId,
          metadata: {
            assetId: asset.id,
            assetCode: asset.code,
            maintenanceType: saved.maintenanceType,
            maintenanceDate: saved.maintenanceDate
          }
        });
      }

      return saved;
    },

    async listByAsset(assetId) {
      await getAsset(assetId);
      return maintenanceRepository.findByAsset(assetId);
    },

    async listByBuilding(buildingId) {
      return maintenanceRepository.findByBuilding(buildingId);
    }
  };
}
