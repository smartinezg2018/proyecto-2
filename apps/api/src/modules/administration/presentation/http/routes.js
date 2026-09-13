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
import { createProfileUseCases } from '../../application/profileUseCases.js';
import { ProfileRepository } from '../../infrastructure/profileRepository.js';
import { createUserUseCases } from '../../application/userUseCases.js';
import { UserRepository } from '../../infrastructure/userRepository.js';
import { AuditRepository } from '../../infrastructure/auditRepository.js';
import { createAuditUseCases } from '../../application/auditUseCases.js';
import { AuthorizationRepository } from '../../../auth/infrastructure/authorizationRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import {
  requirePermission,
  requireAnyPermission
} from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';

export const administrationRoutes = Router();
const buildingRepository = new BuildingRepository();
const unitRepository = new UnitRepository();
const personRepository = new PersonRepository();
const auditRepository = new AuditRepository();
const authorizationRepository = new AuthorizationRepository();
const buildingUseCases = createBuildingUseCases(buildingRepository, auditRepository);
const unitUseCases = createUnitUseCases(unitRepository, buildingRepository, auditRepository);
const personUseCases = createPersonUseCases(personRepository, unitRepository, auditRepository);

const profileUseCases = createProfileUseCases(new ProfileRepository(), auditRepository);
const userUseCases = createUserUseCases(new UserRepository(), auditRepository);
const auditUseCases = createAuditUseCases(auditRepository);
const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

administrationRoutes.post(
  '/users',
  requireAuth,
  requirePermission('users.create'),
  asyncHandler(async (request, response) => {
    const user = await userUseCases.create(request.body, request.user.id);
    response.status(201).json({ data: user, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/users',
  requireAuth,
  requirePermission('users.list'),
  asyncHandler(async (request, response) => {
    const users = await userUseCases.list();
    response.json({
      data: users,
      meta: { requestId: request.id, page: 1, pageSize: users.length }
    });
  })
);

administrationRoutes.get(
  '/users/:userId/profiles',
  requireAuth,
  requirePermission('users.assign_profiles'),
  asyncHandler(async (request, response) => {
    const profileIds = await userUseCases.listProfiles(Number(request.params.userId));
    response.json({ data: { profileIds }, meta: { requestId: request.id } });
  })
);

administrationRoutes.put(
  '/users/:userId/profiles',
  requireAuth,
  requirePermission('users.assign_profiles'),
  asyncHandler(async (request, response) => {
    const result = await userUseCases.assignProfiles(
      Number(request.params.userId),
      request.body,
      request.user.id
    );
    response.json({ data: result, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/users/:userId/buildings',
  requireAuth,
  requirePermission('users.assign_buildings'),
  asyncHandler(async (request, response) => {
    const buildingIds = await userUseCases.listBuildings(Number(request.params.userId));
    response.json({ data: { buildingIds }, meta: { requestId: request.id } });
  })
);

administrationRoutes.put(
  '/users/:userId/buildings',
  requireAuth,
  requirePermission('users.assign_buildings'),
  asyncHandler(async (request, response) => {
    const result = await userUseCases.assignBuildings(
      Number(request.params.userId),
      request.body,
      request.user.id
    );
    response.json({ data: result, meta: { requestId: request.id } });
  })
);

administrationRoutes.post(
  '/profiles',
  requireAuth,
  requirePermission('profiles.create'),
  asyncHandler(async (request, response) => {
    const profile = await profileUseCases.create(request.body, request.user.id);
    response.status(201).json({ data: profile, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/profiles',
  requireAuth,
  requirePermission('profiles.list'),
  asyncHandler(async (request, response) => {
    const profiles = await profileUseCases.list();
    response.json({
      data: profiles,
      meta: { requestId: request.id, page: 1, pageSize: profiles.length }
    });
  })
);

administrationRoutes.get(
  '/permissions',
  requireAuth,
  requireAnyPermission('profiles.create', 'profiles.list'),
  asyncHandler(async (request, response) => {
    const permissions = await profileUseCases.listPermissions();
    response.json({ data: permissions, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/buildings',
  requireAuth,
  requirePermission('buildings.list'),
  asyncHandler(async (request, response) => {
    const permissions = request.user.permissions ?? [];
    const buildings = permissions.includes('admin.all')
      ? await buildingUseCases.list()
      : await authorizationRepository.findAssignedBuildings(request.user.id);
    response.json({
      data: buildings,
      meta: { requestId: request.id, page: 1, pageSize: buildings.length }
    });
  })
);

administrationRoutes.get(
  '/buildings/:buildingId',
  requireAuth,
  requirePermission('buildings.read'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const building = await buildingUseCases.getById(request.params.buildingId);
    response.json({ data: building, meta: { requestId: request.id } });
  })
);

administrationRoutes.post(
  '/buildings',
  requireAuth,
  requirePermission('buildings.create'),
  asyncHandler(async (request, response) => {
    const building = await buildingUseCases.create(request.body, request.user.id);
    response.status(201).json({ data: building, meta: { requestId: request.id } });
  })
);

administrationRoutes.put(
  '/buildings/:buildingId',
  requireAuth,
  requirePermission('buildings.update'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const building = await buildingUseCases.update(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.json({ data: building, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/buildings/:buildingId/units',
  requireAuth,
  requirePermission('units.list'),
  ensureBuildingAccess,
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
  requireAuth,
  requirePermission('units.create'),
  ensureBuildingAccess,
  validateBody(createUnitSchema),
  asyncHandler(async (request, response) => {
    const unit = await unitUseCases.create(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: unit, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/persons',
  requireAuth,
  requirePermission('persons.list'),
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
  requireAuth,
  requirePermission('persons.create'),
  validateBody(createPersonSchema),
  asyncHandler(async (request, response) => {
    const person = await personUseCases.registerResponsible(request.body, request.user.id);
    response.status(201).json({ data: person, meta: { requestId: request.id } });
  })
);

administrationRoutes.get(
  '/audit-logs',
  requireAuth,
  requirePermission('audit.read'),
  asyncHandler(async (request, response) => {
    const result = await auditUseCases.list(request.query);
    response.json({
      data: result.items,
      meta: {
        requestId: request.id,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total
      }
    });
  })
);
