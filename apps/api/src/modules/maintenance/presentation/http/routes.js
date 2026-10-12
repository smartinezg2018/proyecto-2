import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { AssetRepository } from '../../../assets/infrastructure/assetRepository.js';
import { createMaintenanceUseCases } from '../../application/maintenanceUseCases.js';
import { createMaintenanceAlertUseCases } from '../../application/maintenanceAlertUseCases.js';
import { createMaintenanceSupplierUseCases } from '../../application/maintenanceSupplierUseCases.js';
import { createMaintenanceQuoteUseCases } from '../../application/maintenanceQuoteUseCases.js';
import { MaintenanceRepository } from '../../infrastructure/maintenanceRepository.js';
import { MaintenanceAlertRepository } from '../../infrastructure/maintenanceAlertRepository.js';
import { MaintenanceQuoteRepository } from '../../infrastructure/maintenanceQuoteRepository.js';
import { SupplierRepository } from '../../../assets/infrastructure/supplierRepository.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import {
  changeMaintenanceStatusSchema,
  registerMaintenanceSchema,
  updateMaintenanceCostsSchema,
  assignMaintenanceSupplierSchema,
  createMaintenanceQuoteSchema,
  maintenanceAlertSettingsSchema
} from './maintenanceSchemas.js';

export const maintenanceRoutes = Router();
const assetRepository = new AssetRepository();
const maintenanceRepository = new MaintenanceRepository();
const alertRepository = new MaintenanceAlertRepository();
const supplierRepository = new SupplierRepository();
const quoteRepository = new MaintenanceQuoteRepository();
const buildingRepository = new BuildingRepository();

const maintenanceUseCases = createMaintenanceUseCases(
  maintenanceRepository,
  assetRepository,
  new AuditRepository()
);
const maintenanceSupplierUseCases = createMaintenanceSupplierUseCases(
  maintenanceRepository,
  supplierRepository,
  new AuditRepository()
);
const maintenanceQuoteUseCases = createMaintenanceQuoteUseCases(
  quoteRepository,
  maintenanceRepository,
  supplierRepository
);
const maintenanceAlertUseCases = createMaintenanceAlertUseCases(
  alertRepository,
  maintenanceRepository,
  buildingRepository
);

const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

async function ensureAlertBuildingAccess(request, response, next) {
  try {
    const alert = await alertRepository.findById(request.params.alertId);
    if (!alert) {
      throw new AppError('La alerta de mantenimiento no existe.', 404, 'ALERT_NOT_FOUND');
    }
    request.params.buildingId = String(alert.buildingId);
    return ensureBuildingAccess(request, response, next);
  } catch (error) {
    next(error);
  }
}

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
  '/buildings/:buildingId/alert-settings',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const settings = await maintenanceAlertUseCases.getSettings(request.params.buildingId);
    response.json({ data: settings, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.put(
  '/buildings/:buildingId/alert-settings',
  requireAuth,
  requirePermission('maintenance.update'),
  ensureBuildingAccess,
  validateBody(maintenanceAlertSettingsSchema),
  asyncHandler(async (request, response) => {
    const settings = await maintenanceAlertUseCases.saveSettings(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.json({ data: settings, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.get(
  '/buildings/:buildingId/alerts',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const alerts = await maintenanceAlertUseCases.list(request.params.buildingId);
    response.json({
      data: alerts,
      meta: { requestId: request.id, page: 1, pageSize: alerts.length }
    });
  })
);

maintenanceRoutes.patch(
  '/alerts/:alertId/attend',
  requireAuth,
  requirePermission('maintenance.update'),
  ensureAlertBuildingAccess,
  asyncHandler(async (request, response) => {
    const alert = await maintenanceAlertUseCases.markAttended(
      request.params.alertId,
      request.user.id
    );
    response.json({ data: alert, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.get(
  '/maintenances/:maintenanceId',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureMaintenanceBuildingAccess,
  asyncHandler(async (request, response) => {
    const maintenance = await maintenanceUseCases.getById(request.params.maintenanceId);
    response.json({ data: maintenance, meta: { requestId: request.id } });
  })
);

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

maintenanceRoutes.get(
  '/maintenances/:maintenanceId/supplier',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureMaintenanceBuildingAccess,
  asyncHandler(async (request, response) => {
    const supplier = await maintenanceSupplierUseCases.get(request.params.maintenanceId);
    response.json({ data: supplier, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.put(
  '/maintenances/:maintenanceId/supplier',
  requireAuth,
  requirePermission('maintenance.update'),
  ensureMaintenanceBuildingAccess,
  validateBody(assignMaintenanceSupplierSchema),
  asyncHandler(async (request, response) => {
    const supplier = await maintenanceSupplierUseCases.assign(
      request.params.maintenanceId,
      request.body,
      request.user.id
    );
    response.json({ data: supplier, meta: { requestId: request.id } });
  })
);

maintenanceRoutes.get(
  '/maintenances/:maintenanceId/quotes',
  requireAuth,
  requirePermission('maintenance.view'),
  ensureMaintenanceBuildingAccess,
  asyncHandler(async (request, response) => {
    const quotes = await maintenanceQuoteUseCases.list(request.params.maintenanceId);
    response.json({
      data: quotes,
      meta: { requestId: request.id, page: 1, pageSize: quotes.length }
    });
  })
);

maintenanceRoutes.post(
  '/maintenances/:maintenanceId/quotes',
  requireAuth,
  requirePermission('maintenance.update'),
  ensureMaintenanceBuildingAccess,
  validateBody(createMaintenanceQuoteSchema),
  asyncHandler(async (request, response) => {
    const quote = await maintenanceQuoteUseCases.create(
      request.params.maintenanceId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: quote, meta: { requestId: request.id } });
  })
);
