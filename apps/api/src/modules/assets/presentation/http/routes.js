import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { createAssetUseCases } from '../../application/assetUseCases.js';
import { AssetRepository } from '../../infrastructure/assetRepository.js';
import { AssetTypeRepository } from '../../infrastructure/assetTypeRepository.js';
import {
  changeAssetStatusSchema,
  createAssetSchema,
  createAssetTypeSchema,
  updateAssetSchema,
  updateAssetTypeSchema
} from './assetSchemas.js';

export const assetsRoutes = Router();
const assetUseCases = createAssetUseCases(
  new AssetRepository(),
  new BuildingRepository(),
  new AssetTypeRepository()
);

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

assetsRoutes.get(
  '/types',
  asyncHandler(async (request, response) => {
    const types = await assetUseCases.listTypes();
    response.json({
      data: types,
      meta: { requestId: request.id, page: 1, pageSize: types.length }
    });
  })
);

assetsRoutes.post(
  '/types',
  validateBody(createAssetTypeSchema),
  asyncHandler(async (request, response) => {
    const assetType = await assetUseCases.createType(request.body, request.user?.id ?? null);
    response.status(201).json({ data: assetType, meta: { requestId: request.id } });
  })
);

assetsRoutes.put(
  '/types/:typeId',
  validateBody(updateAssetTypeSchema),
  asyncHandler(async (request, response) => {
    const assetType = await assetUseCases.updateType(request.params.typeId, request.body);
    response.json({ data: assetType, meta: { requestId: request.id } });
  })
);

assetsRoutes.delete(
  '/types/:typeId',
  asyncHandler(async (request, response) => {
    await assetUseCases.deleteType(request.params.typeId);
    response.json({ data: { id: Number(request.params.typeId) }, meta: { requestId: request.id } });
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
