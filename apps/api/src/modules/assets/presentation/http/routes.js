import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { createAssetUseCases } from '../../application/assetUseCases.js';
import { createAssetCostUseCases } from '../../application/assetCostUseCases.js';
import { createSupplierUseCases } from '../../application/supplierUseCases.js';
import { AssetRepository } from '../../infrastructure/assetRepository.js';
import { AssetCostRepository } from '../../infrastructure/assetCostRepository.js';
import { SupplierRepository } from '../../infrastructure/supplierRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import {
  acquisitionCostSchema,
  assignSupplierSchema,
  changeAssetStatusSchema,
  createAssetSchema,
  createSupplierSchema,
  operatingCostSchema,
  updateAssetSchema
} from './assetSchemas.js';

export const assetsRoutes = Router();
const assetRepository = new AssetRepository();
const supplierRepository = new SupplierRepository();
const assetCostRepository = new AssetCostRepository();
const auditRepository = new AuditRepository();

const assetUseCases = createAssetUseCases(
  assetRepository,
  new BuildingRepository(),
  auditRepository
);
const supplierUseCases = createSupplierUseCases(
  supplierRepository,
  assetRepository,
  auditRepository
);
const assetCostUseCases = createAssetCostUseCases(
  assetCostRepository,
  assetRepository,
  auditRepository
);

const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

async function ensureAssetBuildingAccess(request, response, next) {
  try {
    const asset = await assetUseCases.getById(request.params.assetId);
    request.params.buildingId = String(asset.buildingId);
    return ensureBuildingAccess(request, response, next);
  } catch (error) {
    next(error);
  }
}

assetsRoutes.get(
  '/buildings/:buildingId/assets',
  requireAuth,
  requirePermission('assets.list'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const assets = await assetUseCases.listByBuilding(request.params.buildingId);
    response.json({
      data: assets,
      meta: { requestId: request.id, page: 1, pageSize: assets.length }
    });
  })
);

assetsRoutes.post(
  '/buildings/:buildingId/assets',
  requireAuth,
  requirePermission('assets.create'),
  ensureBuildingAccess,
  validateBody(createAssetSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.create(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/suppliers',
  requireAuth,
  requirePermission('assets.list'),
  asyncHandler(async (request, response) => {
    const suppliers = await supplierUseCases.list();
    response.json({
      data: suppliers,
      meta: { requestId: request.id, page: 1, pageSize: suppliers.length }
    });
  })
);

assetsRoutes.post(
  '/suppliers',
  requireAuth,
  requirePermission('assets.update'),
  validateBody(createSupplierSchema),
  asyncHandler(async (request, response) => {
    const supplier = await supplierUseCases.create(request.body, request.user.id);
    response.status(201).json({ data: supplier, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId/supplier',
  requireAuth,
  requirePermission('assets.list'),
  ensureAssetBuildingAccess,
  asyncHandler(async (request, response) => {
    const supplier = await supplierUseCases.getByAsset(request.params.assetId);
    response.json({ data: supplier, meta: { requestId: request.id } });
  })
);

assetsRoutes.put(
  '/:assetId/supplier',
  requireAuth,
  requirePermission('assets.update'),
  ensureAssetBuildingAccess,
  validateBody(assignSupplierSchema),
  asyncHandler(async (request, response) => {
    const supplier = await supplierUseCases.assignToAsset(
      request.params.assetId,
      request.body,
      request.user.id
    );
    response.json({ data: supplier, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId/costs/summary',
  requireAuth,
  requirePermission('assets.list'),
  ensureAssetBuildingAccess,
  asyncHandler(async (request, response) => {
    const summary = await assetCostUseCases.getCostsSummary(request.params.assetId, {
      costType: request.query.type || undefined,
      from: request.query.from || undefined,
      to: request.query.to || undefined
    });
    response.json({ data: summary, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId/costs',
  requireAuth,
  requirePermission('assets.list'),
  ensureAssetBuildingAccess,
  asyncHandler(async (request, response) => {
    const costs = await assetCostUseCases.listCosts(request.params.assetId, {
      costType: request.query.type || undefined,
      from: request.query.from || undefined,
      to: request.query.to || undefined
    });
    response.json({
      data: costs,
      meta: { requestId: request.id, page: 1, pageSize: costs.length }
    });
  })
);

assetsRoutes.post(
  '/:assetId/costs/acquisition',
  requireAuth,
  requirePermission('assets.update'),
  ensureAssetBuildingAccess,
  validateBody(acquisitionCostSchema),
  asyncHandler(async (request, response) => {
    const cost = await assetCostUseCases.registerAcquisitionCost(
      request.params.assetId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: cost, meta: { requestId: request.id } });
  })
);

assetsRoutes.post(
  '/:assetId/costs',
  requireAuth,
  requirePermission('assets.update'),
  ensureAssetBuildingAccess,
  validateBody(operatingCostSchema),
  asyncHandler(async (request, response) => {
    const cost = await assetCostUseCases.registerOperatingCost(
      request.params.assetId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: cost, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId/history',
  requireAuth,
  requirePermission('assets.list'),
  ensureAssetBuildingAccess,
  asyncHandler(async (request, response) => {
    const history = await assetUseCases.getHistory(request.params.assetId);
    response.json({
      data: history,
      meta: { requestId: request.id, page: 1, pageSize: history.length }
    });
  })
);

assetsRoutes.patch(
  '/:assetId/status',
  requireAuth,
  requirePermission('assets.update'),
  ensureAssetBuildingAccess,
  validateBody(changeAssetStatusSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.changeStatus(
      request.params.assetId,
      request.body,
      request.user.id
    );
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId',
  requireAuth,
  requirePermission('assets.list'),
  ensureAssetBuildingAccess,
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.getById(request.params.assetId);
    const [supplier, acquisitionCost] = await Promise.all([
      supplierUseCases.getByAsset(request.params.assetId),
      assetCostUseCases.getAcquisitionCost(request.params.assetId)
    ]);
    response.json({
      data: { ...asset, supplier, acquisitionCost },
      meta: { requestId: request.id }
    });
  })
);

assetsRoutes.put(
  '/:assetId',
  requireAuth,
  requirePermission('assets.update'),
  ensureAssetBuildingAccess,
  validateBody(updateAssetSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.update(request.params.assetId, request.body, request.user.id);
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);
