import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { createBuildingUseCases } from '../../application/buildingUseCases.js';
import { createPersonUseCases } from '../../application/personUseCases.js';
import { createUnitUseCases } from '../../application/unitUseCases.js';
import { BuildingRepository } from '../../infrastructure/buildingRepository.js';
import { PersonRepository } from '../../infrastructure/personRepository.js';
import { UnitRepository } from '../../infrastructure/unitRepository.js';
import { createPersonSchema } from './personSchemas.js';
import { createUnitSchema } from './unitSchemas.js';

export const administrationRoutes = Router();
const buildingRepository = new BuildingRepository();
const unitRepository = new UnitRepository();
const personRepository = new PersonRepository();
const buildingUseCases = createBuildingUseCases(buildingRepository);
const unitUseCases = createUnitUseCases(unitRepository, buildingRepository);
const personUseCases = createPersonUseCases(personRepository, unitRepository);

const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

administrationRoutes.get(
  '/buildings',
  asyncHandler(async (request, response) => {
    const buildings = await buildingUseCases.list();
    response.json({
      data: buildings,
      meta: { requestId: request.id, page: 1, pageSize: buildings.length }
    });
  })
);

administrationRoutes.get(
  '/buildings/:buildingId',
  asyncHandler(async (request, response) => {
    const building = await buildingUseCases.getById(request.params.buildingId);
    response.json({ data: building, meta: { requestId: request.id } });
  })
);

administrationRoutes.post(
  '/buildings',
  asyncHandler(async (request, response) => {
    const building = await buildingUseCases.create(request.body, request.user?.id ?? null);
    response.status(201).json({ data: building, meta: { requestId: request.id } });
  })
);

administrationRoutes.put(
  '/buildings/:buildingId',
  asyncHandler(async (request, response) => {
    const building = await buildingUseCases.update(
      request.params.buildingId,
      request.body,
      request.user?.id ?? null
    );
    response.json({ data: building, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/buildings/:buildingId/units',
  asyncHandler(async (request, response) => {
    const units = await unitUseCases.listByBuilding(request.params.buildingId);
    response.json({
      data: units,
      meta: { requestId: request.id, page: 1, pageSize: units.length }
    });
  })
);

administrationRoutes.post(
  '/buildings/:buildingId/units',
  validateBody(createUnitSchema),
  asyncHandler(async (request, response) => {
    const unit = await unitUseCases.create(
      request.params.buildingId,
      request.body,
      request.user?.id ?? null
    );
    response.status(201).json({ data: unit, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/persons',
  asyncHandler(async (request, response) => {
    const persons = await personUseCases.list();
    response.json({
      data: persons,
      meta: { requestId: request.id, page: 1, pageSize: persons.length }
    });
  })
);

administrationRoutes.post(
  '/persons',
  validateBody(createPersonSchema),
  asyncHandler(async (request, response) => {
    const person = await personUseCases.registerResponsible(request.body, request.user?.id ?? null);
    response.status(201).json({ data: person, meta: { requestId: request.id } });
  })
);
