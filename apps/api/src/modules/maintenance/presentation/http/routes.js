import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { AssetRepository } from '../../../assets/infrastructure/assetRepository.js';
import { createMaintenanceUseCases } from '../../application/maintenanceUseCases.js';
import { MaintenanceRepository } from '../../infrastructure/maintenanceRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import {
  changeMaintenanceStatusSchema,
  registerMaintenanceSchema,
  updateMaintenanceCostsSchema
} from './maintenanceSchemas.js';

export const maintenanceRoutes = Router();
const assetRepository = new AssetRepository();
const maintenanceRepository = new MaintenanceRepository();

const maintenanceUseCases = createMaintenanceUseCases(
  maintenanceRepository,
  assetRepository,
  new AuditRepository()
);

const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

async function ensureMaintenanceBuildingAccess(request, response, next) {
  try {
    const maintenance = await maintenanceRepository.findById(request.params.maintenanceId);
    if (!maintenance) {
      throw new AppError('El mantenimiento no existe.', 404, 'MAINTENANCE_NOT_FOUND');
    }
    request.params.buildingId = String(maintenance.buildingId);
    return ensureBuildingAccess(request, response, next);
  } catch (error) {
    next(error);
  }
}

async function ensureAssetBuildingAccess(request, response, next) {
  try {
    const asset = await assetRepository.findById(request.params.assetId);
    if (!asset) {
      throw new AppError('El activo no existe.', 404, 'ASSET_NOT_FOUND');
    }
    request.params.buildingId = String(asset.buildingId);
    return ensureBuildingAccess(request, response, next);
  } catch (error) {
    next(error);
  }
}

maintenanceRoutes.get(
  '/buildings/:buildingId/maintenances',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const maintenances = await maintenanceUseCases.listByBuilding(request.params.buildingId);
    response.json({
      data: maintenances,
      meta: { requestId: request.id, page: 1, pageSize: maintenances.length }
    });
  })
);

maintenanceRoutes.get(
  '/assets/:assetId/maintenances',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureAssetBuildingAccess,
  asyncHandler(async (request, response) => {
    const maintenances = await maintenanceUseCases.listByAsset(request.params.assetId);
    response.json({
      data: maintenances,
      meta: { requestId: request.id, page: 1, pageSize: maintenances.length }
    });
  })
);

maintenanceRoutes.post(
  '/assets/:assetId/maintenances',
  requireAuth,
  requirePermission('maintenance.create'),
  ensureAssetBuildingAccess,
  validateBody(registerMaintenanceSchema),
  asyncHandler(async (request, response) => {
    const maintenance = await maintenanceUseCases.register(
      request.params.assetId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: maintenance, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.get(
  '/maintenances/:maintenanceId/status-history',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureMaintenanceBuildingAccess,
  asyncHandler(async (request, response) => {
    const history = await maintenanceUseCases.listStatusHistory(request.params.maintenanceId);
    response.json({
      data: history,
      meta: { requestId: request.id, page: 1, pageSize: history.length }
    });
  })
);

maintenanceRoutes.patch(
  '/maintenances/:maintenanceId/status',
  requireAuth,
  requirePermission('maintenance.update'),
  ensureMaintenanceBuildingAccess,
  validateBody(changeMaintenanceStatusSchema),
  asyncHandler(async (request, response) => {
    const maintenance = await maintenanceUseCases.changeStatus(
      request.params.maintenanceId,
      request.body,
      request.user.id
    );
    response.json({ data: maintenance, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.patch(
  '/maintenances/:maintenanceId/costs',
  requireAuth,
  requirePermission('maintenance.update'),
  ensureMaintenanceBuildingAccess,
  validateBody(updateMaintenanceCostsSchema),
  asyncHandler(async (request, response) => {
    const maintenance = await maintenanceUseCases.updateCosts(
      request.params.maintenanceId,
      request.body,
      request.user.id
    );
    response.json({ data: maintenance, meta: { requestId: request.id } });
  })
);
