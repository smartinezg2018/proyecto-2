import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { InsuranceQuoteRepository } from '../../infrastructure/insuranceQuoteRepository.js';
import { createInsuranceQuoteUseCases } from '../../application/insuranceQuoteUseCases.js';
import { createInsuranceQuoteSchema, createInsurancePolicySchema, insuranceAlertSettingsSchema } from './schemas.js';
import { InsurancePolicyRepository } from '../../infrastructure/insurancePolicyRepository.js';
import { createInsurancePolicyUseCases } from '../../application/insurancePolicyUseCases.js';

export const insuranceRoutes = Router();
const useCases = createInsuranceQuoteUseCases(new InsuranceQuoteRepository(), new BuildingRepository());
const policyUseCases = createInsurancePolicyUseCases(new InsurancePolicyRepository(), new BuildingRepository());
const asyncHandler = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);

insuranceRoutes.get('/buildings/:buildingId/policies', requireAuth, requirePermission('insurance.view'), ensureBuildingAccess, asyncHandler(async (request, response) => {
  response.json({ data: await policyUseCases.list(request.params.buildingId), meta: { requestId: request.id } });
}));

insuranceRoutes.post('/buildings/:buildingId/policies', requireAuth, requirePermission('insurance.update'), ensureBuildingAccess, validateBody(createInsurancePolicySchema), asyncHandler(async (request, response) => {
  response.status(201).json({ data: await policyUseCases.create(request.params.buildingId, request.body, request.user.id), meta: { requestId: request.id } });
}));

insuranceRoutes.get('/buildings/:buildingId/alert-settings', requireAuth, requirePermission('insurance.view'), ensureBuildingAccess, asyncHandler(async (request, response) => {
  response.json({ data: await policyUseCases.getSettings(request.params.buildingId), meta: { requestId: request.id } });
}));

insuranceRoutes.put('/buildings/:buildingId/alert-settings', requireAuth, requirePermission('insurance.update'), ensureBuildingAccess, validateBody(insuranceAlertSettingsSchema), asyncHandler(async (request, response) => {
  response.json({ data: await policyUseCases.saveSettings(request.params.buildingId, request.body, request.user.id), meta: { requestId: request.id } });
}));

insuranceRoutes.get('/buildings/:buildingId/quotes', requireAuth, requirePermission('insurance.view'), ensureBuildingAccess, asyncHandler(async (request, response) => {
  const quotes = await useCases.list(request.params.buildingId);
  response.json({ data: quotes, meta: { requestId: request.id, page: 1, pageSize: quotes.length } });
}));

insuranceRoutes.post('/buildings/:buildingId/quotes', requireAuth, requirePermission('insurance.update'), ensureBuildingAccess, validateBody(createInsuranceQuoteSchema), asyncHandler(async (request, response) => {
  const quote = await useCases.create(request.params.buildingId, request.body, request.user.id);
  response.status(201).json({ data: quote, meta: { requestId: request.id } });
}));
