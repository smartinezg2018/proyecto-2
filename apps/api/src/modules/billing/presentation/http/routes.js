import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { BillingRepository } from '../../infrastructure/billingRepository.js';
import { createBillingUseCases } from '../../application/billingUseCases.js';
import {
  generateExtraordinaryChargesSchema,
  generateOrdinaryInvoicesSchema
} from './billingSchemas.js';

export const billingRoutes = Router();
const useCases = createBillingUseCases(new BillingRepository());
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

billingRoutes.post(
  '/buildings/:buildingId/invoices/ordinary',
  requireAuth,
  requirePermission('billing.invoice.create'),
  ensureBuildingAccess,
  validateBody(generateOrdinaryInvoicesSchema),
  asyncHandler(async (request, response) => {
    const invoices = await useCases.generateOrdinaryInvoices(
      { ...request.body, buildingId: Number(request.params.buildingId) },
      request.user.id
    );

    billingRoutes.post(
      '/buildings/:buildingId/charges/extraordinary',
      requireAuth,
      requirePermission('billing.charge.create'),
      ensureBuildingAccess,
      validateBody(generateExtraordinaryChargesSchema),
      asyncHandler(async (request, response) => {
        const charges = await useCases.generateExtraordinaryCharges(
          { ...request.body, buildingId: Number(request.params.buildingId) },
          request.user.id
        );
        response.status(201).json({ data: charges, meta: { requestId: request.id } });
      })
    );
    response.status(201).json({ data: invoices, meta: { requestId: request.id } });
  })
);
