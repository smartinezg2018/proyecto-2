import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { createAssetUseCases } from '../../application/assetUseCases.js';
import { AssetRepository } from '../../infrastructure/assetRepository.js';
import {
  changeAssetStatusSchema,
  createAssetSchema,
  registerAcquisitionCostSchema,
  updateAssetSchema
} from './assetSchemas.js';

export const assetsRoutes = Router();
const assetUseCases = createAssetUseCases(new AssetRepository(), new BuildingRepository());

const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

assetsRoutes.get(
  '/buildings/:buildingId/assets',
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
  validateBody(createAssetSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.create(
      request.params.buildingId,
      request.body,
      request.user?.id ?? null
    );
    response.status(201).json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.put(
  '/:assetId/acquisition-cost',
  validateBody(registerAcquisitionCostSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.registerAcquisitionCost(
      request.params.assetId,
      request.body,
      request.user?.id ?? null
    );
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId/history',
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
  validateBody(changeAssetStatusSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.changeStatus(
      request.params.assetId,
      request.body,
      request.user?.id ?? null
    );
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.get(
  '/:assetId',
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.getById(request.params.assetId);
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);

assetsRoutes.put(
  '/:assetId',
  validateBody(updateAssetSchema),
  asyncHandler(async (request, response) => {
    const asset = await assetUseCases.update(
      request.params.assetId,
      request.body,
      request.user?.id ?? null
    );
    response.json({ data: asset, meta: { requestId: request.id } });
  })
);
