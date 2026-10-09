import { AppError } from '../../../shared/errors/AppError.js';
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_TRANSITIONS,
  MAINTENANCE_TYPES
} from '../domain/maintenanceCatalog.js';

const INITIAL_STATUS = 'programado';

const STATUS_LABELS = {
  programado: 'programado',
  // eslint-disable-next-line camelcase
  en_ejecucion: 'en ejecución',
  finalizado: 'finalizado',
  cancelado: 'cancelado'
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_REASON_MAX_LENGTH = 255;
const COST_LABELS = { estimatedCost: 'costo estimado', actualCost: 'costo real' };
const COST_FIELDS = Object.keys(COST_LABELS);
// DECIMAL(15, 2) column limit.
const MAX_COST = 9999999999999.99;

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

function normalizeCost(value, field) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const label = COST_LABELS[field];
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new AppError(`El ${label} debe ser numérico.`, 400, 'VALIDATION_ERROR');
  }

  if (amount < 0) {
    throw new AppError(`El ${label} no puede ser negativo.`, 400, 'VALIDATION_ERROR');
  }

  if (amount > MAX_COST) {
    throw new AppError(`El ${label} excede el valor máximo permitido.`, 400, 'VALIDATION_ERROR');
  }

  if (Math.round(amount * 100) / 100 !== amount) {
    throw new AppError(`El ${label} admite como máximo dos decimales.`, 400, 'VALIDATION_ERROR');
  }

  return amount;
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function present(maintenance) {
  return {
    ...maintenance,
    nextStatuses: MAINTENANCE_STATUS_TRANSITIONS[maintenance.status] ?? []
  };
}

function assertStatus(status) {
  if (!MAINTENANCE_STATUSES.includes(status)) {
    throw new AppError(
      'El estado del mantenimiento no es válido. Use programado, en_ejecucion, finalizado o cancelado.',
      400,
      'VALIDATION_ERROR'
    );
  }
}

function assertTransition(fromStatus, toStatus) {
  const allowed = MAINTENANCE_STATUS_TRANSITIONS[fromStatus] ?? [];
  if (allowed.includes(toStatus)) {
    return;
  }

  if (fromStatus === 'finalizado' || fromStatus === 'cancelado') {
    throw new AppError(
      `Un mantenimiento ${STATUS_LABELS[fromStatus]} no admite más cambios de estado.`,
      409,
      'INVALID_STATUS_TRANSITION'
    );
  }

  throw new AppError(
    `No se puede cambiar el estado de ${STATUS_LABELS[fromStatus]} a ${STATUS_LABELS[toStatus]}.`,
    409,
    'INVALID_STATUS_TRANSITION'
  );
}

export function createMaintenanceUseCases(maintenanceRepository, assetRepository, audit = null) {
  async function getAsset(assetId) {
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
    }
    return asset;
  }

  async function getMaintenance(maintenanceId) {
    const maintenance = await maintenanceRepository.findById(maintenanceId);
    if (!maintenance) {
      throw new AppError('El mantenimiento no existe.', 404, 'MAINTENANCE_NOT_FOUND');
    }
    return maintenance;
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
      const estimatedCost = normalizeCost(input.estimatedCost, 'estimatedCost');
      const actualCost = normalizeCost(input.actualCost, 'actualCost');

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
          status: INITIAL_STATUS,
          estimatedCost,
          actualCost,
          createdBy: userId
        },
        {
          changeType: 'mantenimiento',
          field: null,
          oldValue: null,
          newValue: input.maintenanceType,
          reason: truncate(description, HISTORY_REASON_MAX_LENGTH),
          createdBy: userId
        },
        {
          fromStatus: null,
          toStatus: INITIAL_STATUS,
          changedBy: userId,
          changedAt: new Date()
        }
      );

      if (audit) {
        const metadata = {
          assetId: asset.id,
          assetCode: asset.code,
          maintenanceType: saved.maintenanceType,
          maintenanceDate: saved.maintenanceDate,
          estimatedCost,
          actualCost
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

      return present(saved);
    },

    async listByAsset(assetId) {
      await getAsset(assetId);
      const maintenances = await maintenanceRepository.findByAsset(assetId);
      return maintenances.map(present);
    },

    async listByBuilding(buildingId) {
      const maintenances = await maintenanceRepository.findByBuilding(buildingId);
      return maintenances.map(present);
    },

    async changeStatus(maintenanceId, input, userId = null) {
      assertStatus(input.status);

      const current = await getMaintenance(maintenanceId);
      const previousStatus = current.status;
      if (previousStatus === input.status) {
        throw new AppError(
          'El mantenimiento ya se encuentra en ese estado.',
          409,
          'UNCHANGED_MAINTENANCE_STATUS'
        );
      }

      assertTransition(previousStatus, input.status);

      const changedAt = new Date();
      const updated = await maintenanceRepository.updateStatus(
        maintenanceId,
        input.status,
        userId,
        {
          fromStatus: previousStatus,
          toStatus: input.status,
          changedBy: userId,
          changedAt
        }
      );

      if (audit) {
        await audit.record({
          userId,
          action: 'status_change',
          module: 'maintenance',
          entity: 'maintenance',
          entityId: updated.id,
          buildingId: updated.buildingId,
          metadata: {
            assetId: updated.assetId,
            from: previousStatus,
            to: input.status,
            changedAt: changedAt.toISOString()
          }
        });
      }

      return present(updated);
    },

    async updateCosts(maintenanceId, input, userId = null) {
      const providedFields = COST_FIELDS.filter((field) => input[field] !== undefined);
      if (providedFields.length === 0) {
        throw new AppError(
          'Debe enviar el costo estimado o el costo real del mantenimiento.',
          400,
          'VALIDATION_ERROR'
        );
      }

      const current = await getMaintenance(maintenanceId);
      const previous = {
        estimatedCost: current.estimatedCost ?? null,
        actualCost: current.actualCost ?? null
      };
      const next = { ...previous };
      for (const field of providedFields) {
        next[field] = normalizeCost(input[field], field);
      }

      const updated = await maintenanceRepository.updateCosts(maintenanceId, next, userId);

      if (audit) {
        await audit.record({
          userId,
          action: 'cost_update',
          module: 'maintenance',
          entity: 'maintenance',
          entityId: updated.id,
          buildingId: updated.buildingId,
          metadata: {
            assetId: updated.assetId,
            before: previous,
            after: next
          }
        });
      }

      return present(updated);
    },

    async listStatusHistory(maintenanceId) {
      await getMaintenance(maintenanceId);
      return maintenanceRepository.findStatusHistory(maintenanceId);
    }
  };
}
