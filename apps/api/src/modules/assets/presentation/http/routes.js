import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { createAssetUseCases } from '../../application/assetUseCases.js';
import { AssetRepository } from '../../infrastructure/assetRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { changeAssetStatusSchema, createAssetSchema, updateAssetSchema } from './assetSchemas.js';

export const assetsRoutes = Router();
const assetRepository = new AssetRepository();
const assetUseCases = createAssetUseCases(
  assetRepository,
  new BuildingRepository(),
  new AuditRepository()
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
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.put(
  '/:assetId',
  requireAuth,
  requirePermission('assets.update'),
  ensureAssetBuildingAccess,
  validateBody(updateAssetSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.update(
      request.params.assetId,
      request.body,
      request.user.id
    );
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);
