import { Router } from 'express';
import { createBuildingUseCases } from '../../application/buildingUseCases.js';
import { BuildingRepository } from '../../infrastructure/buildingRepository.js';
import { createProfileUseCases } from '../../application/profileUseCases.js';
import { ProfileRepository } from '../../infrastructure/profileRepository.js';

export const administrationRoutes = Router();
const buildingUseCases = createBuildingUseCases(new BuildingRepository());
const profileUseCases = createProfileUseCases(new ProfileRepository());
const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

administrationRoutes.post('/profiles', asyncHandler(async (request, response) => {
  const profile = await profileUseCases.create(request.body, request.user?.id ?? null);
  response.status(201).json({ data: profile, meta: { requestId: request.id } });
}));

administrationRoutes.get('/permissions', asyncHandler(async (request, response) => {
  const permissions = await profileUseCases.listPermissions();
  response.json({ data: permissions, meta: { requestId: request.id } });
}));

administrationRoutes.get('/buildings', asyncHandler(async (request, response) => {
  const buildings = await buildingUseCases.list();
    response.json({ data: buildings, meta: { requestId: request.id, page: 1, pageSize: buildings.length } });
}));

administrationRoutes.get('/buildings/:buildingId', asyncHandler(async (request, response) => {
  const building = await buildingUseCases.getById(request.params.buildingId);
  response.json({ data: building, meta: { requestId: request.id } });
}));

administrationRoutes.post('/buildings', asyncHandler(async (request, response) => {
  const building = await buildingUseCases.create(request.body, request.user?.id ?? null);
  response.status(201).json({ data: building, meta: { requestId: request.id } });
}));

administrationRoutes.put('/buildings/:buildingId', asyncHandler(async (request, response) => {
  const building = await buildingUseCases.update(
    request.params.buildingId,
    request.body,
    request.user?.id ?? null
  );
  response.json({ data: building, meta: { requestId: request.id } });
}));
