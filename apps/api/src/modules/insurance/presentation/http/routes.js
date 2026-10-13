import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { BuildingRepository } from '../../../administration/infrastructure/buildingRepository.js';
import { AuditRepository } from '../../../administration/infrastructure/auditRepository.js';
import { AssetRepository } from '../../../assets/infrastructure/assetRepository.js';
import { InsuranceQuoteRepository } from '../../infrastructure/insuranceQuoteRepository.js';
import { createInsuranceQuoteUseCases } from '../../application/insuranceQuoteUseCases.js';
import {
  createInsuranceQuoteSchema,
  createInsurancePolicySchema,
  updateInsurancePolicySchema,
  listInsurancePoliciesQuerySchema,
  createInsuranceClaimSchema,
  insuranceAlertSettingsSchema,
  listInsuranceClaimsQuerySchema
} from './schemas.js';
import { InsurancePolicyRepository } from '../../infrastructure/insurancePolicyRepository.js';
import { createInsurancePolicyUseCases } from '../../application/insurancePolicyUseCases.js';
import { InsuranceClaimRepository } from '../../infrastructure/insuranceClaimRepository.js';
import { createInsuranceClaimUseCases } from '../../application/insuranceClaimUseCases.js';
import { claimUpload } from './claimUpload.js';
import { ClaimDocumentStorage } from '../../infrastructure/claimDocumentStorage.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export const insuranceRoutes = Router();
const useCases = createInsuranceQuoteUseCases(
  new InsuranceQuoteRepository(),
  new BuildingRepository()
);
const policyUseCases = createInsurancePolicyUseCases(
  new InsurancePolicyRepository(),
  new BuildingRepository(),
  undefined,
  new AssetRepository(),
  new AuditRepository()
);
const claimUseCases = createInsuranceClaimUseCases(
  new InsuranceClaimRepository(),
  new InsurancePolicyRepository(),
  new AssetRepository(),
  new BuildingRepository()
);
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

insuranceRoutes.get(
  '/buildings/:buildingId/claims',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsed = listInsuranceClaimsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError('Los filtros de reclamaciones no son válidos.', 400, 'VALIDATION_ERROR');
    }
    const claims = await claimUseCases.list(request.params.buildingId, parsed.data);
    response.json({
      data: claims,
      meta: { requestId: request.id, page: 1, pageSize: claims.length }
    });
  })
);

insuranceRoutes.post(
  '/buildings/:buildingId/claims',
  requireAuth,
  requirePermission('insurance.update'),
  ensureBuildingAccess,
  claimUpload,
  validateBody(createInsuranceClaimSchema),
  asyncHandler(async (request, response) => {
    const claim = await claimUseCases.create(
      request.params.buildingId,
      request.body,
      request.user.id,
      request.files ?? []
    );
    response.status(201).json({ data: claim, meta: { requestId: request.id } });
  })
);

insuranceRoutes.get(
  '/buildings/:buildingId/claims/:claimId/documents/:documentId',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response, next) => {
    const { buildingId, claimId, documentId } = request.params;
    const storage = new ClaimDocumentStorage();
    const filePath = storage.filePath(documentId);
    if (!/^[1-9]\d*$/.test(claimId))
      throw new AppError('Documento no encontrado.', 404, 'DOCUMENT_NOT_FOUND');
    const document = await new InsuranceClaimRepository().findDocument(
      buildingId,
      claimId,
      documentId
    );
    if (!document) throw new AppError('Documento no encontrado.', 404, 'DOCUMENT_NOT_FOUND');
    response.set({
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Cache-Control': 'no-store',
      'Content-Type': 'application/octet-stream'
    });
    response.download(filePath, document.originalName, (error) => {
      if (error && !response.headersSent)
        next(new AppError('Documento no disponible.', 404, 'DOCUMENT_NOT_FOUND'));
    });
  })
);

insuranceRoutes.get(
  '/buildings/:buildingId/policies',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsed = listInsurancePoliciesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError('Los filtros de pólizas no son válidos.', 400, 'VALIDATION_ERROR');
    }
    const policies = await policyUseCases.list(request.params.buildingId, parsed.data);
    response.json({
      data: policies,
      meta: { requestId: request.id, page: 1, pageSize: policies.length }
    });
  })
);

insuranceRoutes.post(
  '/buildings/:buildingId/policies',
  requireAuth,
  requirePermission('insurance.update'),
  ensureBuildingAccess,
  validateBody(createInsurancePolicySchema),
  asyncHandler(async (request, response) => {
    response.status(201).json({
      data: await policyUseCases.create(request.params.buildingId, request.body, request.user.id),
      meta: { requestId: request.id }
    });
  })
);

insuranceRoutes.get(
  '/buildings/:buildingId/assets/:assetId/policies',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const policies = await policyUseCases.listByAsset(
      request.params.buildingId,
      request.params.assetId
    );
    response.json({
      data: policies,
      meta: { requestId: request.id, page: 1, pageSize: policies.length }
    });
  })
);

insuranceRoutes.get(
  '/buildings/:buildingId/policies/:policyId',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    response.json({
      data: await policyUseCases.getById(request.params.buildingId, request.params.policyId),
      meta: { requestId: request.id }
    });
  })
);

insuranceRoutes.put(
  '/buildings/:buildingId/policies/:policyId',
  requireAuth,
  requirePermission('insurance.update'),
  ensureBuildingAccess,
  validateBody(updateInsurancePolicySchema),
  asyncHandler(async (request, response) => {
    response.json({
      data: await policyUseCases.update(
        request.params.buildingId,
        request.params.policyId,
        request.body,
        request.user.id
      ),
      meta: { requestId: request.id }
    });
  })
);

insuranceRoutes.get(
  '/buildings/:buildingId/alert-settings',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    response.json({
      data: await policyUseCases.getSettings(request.params.buildingId),
      meta: { requestId: request.id }
    });
  })
);

insuranceRoutes.put(
  '/buildings/:buildingId/alert-settings',
  requireAuth,
  requirePermission('insurance.update'),
  ensureBuildingAccess,
  validateBody(insuranceAlertSettingsSchema),
  asyncHandler(async (request, response) => {
    response.json({
      data: await policyUseCases.saveSettings(
        request.params.buildingId,
        request.body,
        request.user.id
      ),
      meta: { requestId: request.id }
    });
  })
);

insuranceRoutes.get(
  '/buildings/:buildingId/quotes',
  requireAuth,
  requirePermission('insurance.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const quotes = await useCases.list(request.params.buildingId);
    response.json({
      data: quotes,
      meta: { requestId: request.id, page: 1, pageSize: quotes.length }
    });
  })
);

insuranceRoutes.post(
  '/buildings/:buildingId/quotes',
  requireAuth,
  requirePermission('insurance.update'),
  ensureBuildingAccess,
  validateBody(createInsuranceQuoteSchema),
  asyncHandler(async (request, response) => {
    const quote = await useCases.create(request.params.buildingId, request.body, request.user.id);
    response.status(201).json({ data: quote, meta: { requestId: request.id } });
  })
);
