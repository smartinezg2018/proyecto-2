import { AppError } from '../../../shared/errors/AppError.js';
import { ASSET_COST_TYPES, OPERATING_COST_TYPES } from '../domain/assetCatalog.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(value, fieldLabel) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new AppError(
      `La ${fieldLabel} debe tener el formato YYYY-MM-DD.`,
      400,
      'VALIDATION_ERROR'
    );
  }
}

function parseAmount(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  throw new AppError('El valor del costo debe ser numérico.', 400, 'VALIDATION_ERROR');
}

function validateAmount(value) {
  const amount = parseAmount(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError('El valor del costo no puede ser negativo.', 400, 'VALIDATION_ERROR');
  }
  return amount;
}

function optionalText(value, fieldName) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new AppError(`El campo ${fieldName} debe ser texto.`, 400, 'VALIDATION_ERROR');
  }
}

function normalizeCostInput(input, costType) {
  optionalText(input.documentRef, 'documentRef');
  optionalText(input.notes, 'notes');
  validateDate(input.costDate, 'fecha del costo');

  return {
    costType,
    amount: validateAmount(input.amount),
    costDate: input.costDate,
    documentRef: input.documentRef?.trim() || null,
    notes: input.notes?.trim() || null
  };
}

function buildSummary(costs) {
  const byType = Object.fromEntries(ASSET_COST_TYPES.map((type) => [type, 0]));
  let total = 0;
  let operatingTotal = 0;

  for (const cost of costs) {
    byType[cost.costType] = (byType[cost.costType] || 0) + cost.amount;
    total += cost.amount;
    if (OPERATING_COST_TYPES.includes(cost.costType)) {
      operatingTotal += cost.amount;
    }
  }

  return {
    total: Number(total.toFixed(2)),
    operatingTotal: Number(operatingTotal.toFixed(2)),
    byType: Object.fromEntries(
      Object.entries(byType).map(([type, amount]) => [type, Number(amount.toFixed(2))])
    )
  };
}

export function createAssetCostUseCases(assetCostRepository, assetRepository, audit = null) {
  return {
    async registerAcquisitionCost(assetId, input, userId = null) {
      const asset = await assetRepository.findById(assetId);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      const costInput = normalizeCostInput(input, 'adquisicion');
      const existing = await assetCostRepository.findAcquisitionByAsset(assetId);

      let saved;
      if (existing) {
        saved = await assetCostRepository.update(existing.id, {
          ...costInput,
          updatedBy: userId
        });
      } else {
        saved = await assetCostRepository.create({
          ...costInput,
          assetId: Number(assetId),
          createdBy: userId
        });
      }

      if (audit) {
        await audit.record({
          userId,
          action: existing ? 'update' : 'create',
          module: 'assets',
          entity: 'asset_cost',
          entityId: saved.id,
          buildingId: asset.buildingId,
          metadata: {
            assetId: Number(assetId),
            costType: 'adquisicion',
            amount: saved.amount,
            costDate: saved.costDate,
            documentRef: saved.documentRef
          }
        });
      }

      return saved;
    },

    async registerOperatingCost(assetId, input, userId = null) {
      const asset = await assetRepository.findById(assetId);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      if (!OPERATING_COST_TYPES.includes(input.costType)) {
        throw new AppError(
          'El tipo de costo debe ser reparacion, mejora o mantenimiento.',
          400,
          'VALIDATION_ERROR'
        );
      }

      const costInput = normalizeCostInput(input, input.costType);
      const saved = await assetCostRepository.create({
        ...costInput,
        assetId: Number(assetId),
        createdBy: userId
      });

      if (audit) {
        await audit.record({
          userId,
          action: 'create',
          module: 'assets',
          entity: 'asset_cost',
          entityId: saved.id,
          buildingId: asset.buildingId,
          metadata: {
            assetId: Number(assetId),
            costType: saved.costType,
            amount: saved.amount,
            costDate: saved.costDate
          }
        });
      }

      return saved;
    },

    async listCosts(assetId, filters = {}) {
      const asset = await assetRepository.findById(assetId);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      if (filters.costType && !ASSET_COST_TYPES.includes(filters.costType)) {
        throw new AppError('El tipo de costo no es válido.', 400, 'VALIDATION_ERROR');
      }

      if (filters.from) {
        validateDate(filters.from, 'fecha inicial');
      }
      if (filters.to) {
        validateDate(filters.to, 'fecha final');
      }

      return assetCostRepository.findByAsset(assetId, filters);
    },

    async getCostsSummary(assetId, filters = {}) {
      const costs = await this.listCosts(assetId, {
        from: filters.from,
        to: filters.to,
        costType: filters.costType
      });

      return {
        ...buildSummary(costs),
        items: costs
      };
    },

    async getAcquisitionCost(assetId) {
      const asset = await assetRepository.findById(assetId);
      if (!asset) {
        throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
      }

      return assetCostRepository.findAcquisitionByAsset(assetId);
    }
  };
}
