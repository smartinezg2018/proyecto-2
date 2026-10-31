import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { SupplierRepository } from '../../../assets/infrastructure/supplierRepository.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { createProjectUseCases } from '../../application/projectUseCases.js';
import { createProjectQuoteUseCases } from '../../application/projectQuoteUseCases.js';
import { createProjectProgressUseCases } from '../../application/projectProgressUseCases.js';
import { ProjectRepository } from '../../infrastructure/projectRepository.js';
import { ProjectQuoteRepository } from '../../infrastructure/projectQuoteRepository.js';
import { ProjectProgressRepository } from '../../infrastructure/projectProgressRepository.js';
import {
  registerProjectSchema,
  registerProjectQuoteSchema,
  registerProjectProgressSchema,
  selectProjectQuoteSchema
} from './projectSchemas.js';

export const projectRoutes = Router();
const projectRepository = new ProjectRepository();
const buildingRepository = new BuildingRepository();
const auditRepository = new AuditRepository();
const projectUseCases = createProjectUseCases(
  projectRepository,
  buildingRepository,
  auditRepository
);
const projectQuoteUseCases = createProjectQuoteUseCases(
  new ProjectQuoteRepository(),
  projectRepository,
  buildingRepository,
  new SupplierRepository(),
  auditRepository
);
const projectProgressUseCases = createProjectProgressUseCases(
  new ProjectProgressRepository(),
  projectRepository,
  buildingRepository,
  new ProjectQuoteRepository(),
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

projectRoutes.get(
  '/buildings/:buildingId/projects/:projectId/quotes',
  requireAuth,
  requirePermission('projects.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const quotes = await projectQuoteUseCases.list(
      request.params.buildingId,
      request.params.projectId
    );
    response.json({
      data: quotes,
      meta: { requestId: request.id, page: 1, pageSize: quotes.length }
    });
  })
);

projectRoutes.post(
  '/buildings/:buildingId/projects/:projectId/quotes',
  requireAuth,
  requirePermission('projects.update'),
  ensureBuildingAccess,
  validateBody(registerProjectQuoteSchema),
  asyncHandler(async (request, response) => {
    const quote = await projectQuoteUseCases.register(
      request.params.buildingId,
      request.params.projectId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: quote, meta: { requestId: request.id } });
  })
);

projectRoutes.post(
  '/buildings/:buildingId/projects/:projectId/quotes/selection',
  requireAuth,
  requirePermission('projects.update'),
  ensureBuildingAccess,
  validateBody(selectProjectQuoteSchema),
  asyncHandler(async (request, response) => {
    const project = await projectQuoteUseCases.select(
      request.params.buildingId,
      request.params.projectId,
      request.body,
      request.user.id
    );
    response.json({ data: project, meta: { requestId: request.id } });
  })
);

projectRoutes.get(
  '/buildings/:buildingId/projects/:projectId/progress',
  requireAuth,
  requirePermission('projects.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const progress = await projectProgressUseCases.list(
      request.params.buildingId,
      request.params.projectId
    );
    response.json({
      data: progress,
      meta: { requestId: request.id, page: 1, pageSize: progress.length }
    });
  })
);

projectRoutes.post(
  '/buildings/:buildingId/projects/:projectId/progress',
  requireAuth,
  requirePermission('projects.update'),
  ensureBuildingAccess,
  validateBody(registerProjectProgressSchema),
  asyncHandler(async (request, response) => {
    const progress = await projectProgressUseCases.register(
      request.params.buildingId,
      request.params.projectId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: progress, meta: { requestId: request.id } });
  })
);
