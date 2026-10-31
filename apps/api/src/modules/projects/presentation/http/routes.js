import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { createProjectUseCases } from '../../application/projectUseCases.js';
import { ProjectRepository } from '../../infrastructure/projectRepository.js';
import { registerProjectSchema } from './projectSchemas.js';

export const projectRoutes = Router();
const projectRepository = new ProjectRepository();
const buildingRepository = new BuildingRepository();
const auditRepository = new AuditRepository();
const projectUseCases = createProjectUseCases(
  projectRepository,
  buildingRepository,
  auditRepository
);
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

projectRoutes.get(
  '/buildings/:buildingId/projects',
  requireAuth,
  requirePermission('projects.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const projects = await projectUseCases.listByBuilding(request.params.buildingId);
    response.json({
      data: projects,
      meta: { requestId: request.id, page: 1, pageSize: projects.length }
    });
  })
);

projectRoutes.post(
  '/buildings/:buildingId/projects',
  requireAuth,
  requirePermission('projects.create'),
  ensureBuildingAccess,
  validateBody(registerProjectSchema),
  asyncHandler(async (request, response) => {
    const project = await projectUseCases.register(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: project, meta: { requestId: request.id } });
  })
);
