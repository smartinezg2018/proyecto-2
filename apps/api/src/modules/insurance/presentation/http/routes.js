import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { InsuranceQuoteRepository } from '../../infrastructure/insuranceQuoteRepository.js';
import { createInsuranceQuoteUseCases } from '../../application/insuranceQuoteUseCases.js';
import { createInsuranceQuoteSchema } from './schemas.js';

export const insuranceRoutes = Router();
const useCases = createInsuranceQuoteUseCases(new InsuranceQuoteRepository(), new BuildingRepository());
const asyncHandler = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);

insuranceRoutes.get('/buildings/:buildingId/quotes', requireAuth, requirePermission('insurance.view'), ensureBuildingAccess, asyncHandler(async (request, response) => {
  const quotes = await useCases.list(request.params.buildingId);
  response.json({ data: quotes, meta: { requestId: request.id, page: 1, pageSize: quotes.length } });
}));

insuranceRoutes.post('/buildings/:buildingId/quotes', requireAuth, requirePermission('insurance.update'), ensureBuildingAccess, validateBody(createInsuranceQuoteSchema), asyncHandler(async (request, response) => {
  const quote = await useCases.create(request.params.buildingId, request.body, request.user.id);
  response.status(201).json({ data: quote, meta: { requestId: request.id } });
}));