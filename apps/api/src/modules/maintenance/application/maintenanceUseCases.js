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

function validateType(input) {
  if (!MAINTENANCE_TYPES.includes(input.maintenanceType)) {
    throw new AppError(
      'El tipo de mantenimiento debe ser preventivo o correctivo.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function validateDate(input) {
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
}

function validatePreventiveInput(input) {
  if (typeof input.description !== 'string' || input.description.trim() === '') {
    throw new AppError('La descripción del mantenimiento es obligatoria.', 400, 'VALIDATION_ERROR');
  }
}

function validateCorrectiveInput(input) {
  if (typeof input.failure !== 'string' || input.failure.trim() === '') {
    throw new AppError(
      'La falla del mantenimiento correctivo es obligatoria.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (typeof input.cause !== 'string' || input.cause.trim() === '') {
    throw new AppError(
      'La causa del mantenimiento correctivo es obligatoria.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (typeof input.actionsTaken !== 'string' || input.actionsTaken.trim() === '') {
    throw new AppError(
      'Las acciones ejecutadas del mantenimiento correctivo son obligatorias.',
      400,
      'VALIDATION_ERROR'
    );
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

      validateType(input);
      validateDate(input);

      const isCorrective = input.maintenanceType === 'correctivo';

      let failure = null;
      let cause = null;
      let actionsTaken = null;
      let description;

      if (isCorrective) {
        validateCorrectiveInput(input);
        failure = input.failure.trim();
        cause = input.cause.trim();
        actionsTaken = input.actionsTaken.trim();

        if (typeof input.description === 'string' && input.description.trim() !== '') {
          description = input.description.trim();
        } else {
          description = `Falla: ${failure} | Causa: ${cause} | Acciones: ${actionsTaken}`;
        }
      } else {
        validatePreventiveInput(input);
        description = input.description.trim();
      }

      const saved = await maintenanceRepository.create(
        {
          assetId: asset.id,
          buildingId: asset.buildingId,
          maintenanceType: input.maintenanceType,
          maintenanceDate: input.maintenanceDate,
          description,
          failureDescription: failure,
          cause,
          actionsTaken,
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
        const metadata = {
          assetId: asset.id,
          assetCode: asset.code,
          maintenanceType: saved.maintenanceType,
          maintenanceDate: saved.maintenanceDate
        };

        if (isCorrective) {
          metadata.failure = failure;
          metadata.cause = cause;
          metadata.actionsTaken = actionsTaken;
        }

        await audit.record({
          userId,
          action: 'create',
          module: 'maintenance',
          entity: 'maintenance',
          entityId: saved.id,
          buildingId: asset.buildingId,
          metadata
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
