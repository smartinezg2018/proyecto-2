import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { BudgetRepository } from '../../infrastructure/budgetRepository.js';
import { createBudgetUseCases } from '../../application/budgetUseCases.js';
import {
  budgetIncrementsSchema,
  budgetYearSchema,
  ensureDraftBudgetSchema
} from './budgetSchemas.js';

export const budgetRoutes = Router();
const useCases = createBudgetUseCases(new BudgetRepository());
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

budgetRoutes.get(
  '/buildings/:buildingId/budgets/draft',
  requireAuth,
  requirePermission('budget.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsedYear = budgetYearSchema.safeParse(request.query.year);
    if (!parsedYear.success) {
      throw new AppError('El año del presupuesto no es válido.', 400, 'VALIDATION_ERROR');
    }
    const budget = await useCases.getDraftBudget(request.params.buildingId, parsedYear.data);
    response.json({ data: budget, meta: { requestId: request.id } });
  })
);

budgetRoutes.post(
  '/buildings/:buildingId/budgets/draft',
  requireAuth,
  requirePermission('budget.update'),
  ensureBuildingAccess,
  validateBody(ensureDraftBudgetSchema),
  asyncHandler(async (request, response) => {
    const budget = await useCases.ensureDraftBudget(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: budget, meta: { requestId: request.id } });
  })
);

budgetRoutes.post(
  '/buildings/:buildingId/budgets/increments/preview',
  requireAuth,
  requirePermission('budget.update'),
  ensureBuildingAccess,
  validateBody(budgetIncrementsSchema),
  asyncHandler(async (request, response) => {
    const preview = await useCases.previewIncrements(request.params.buildingId, request.body);
    response.json({ data: preview, meta: { requestId: request.id } });
  })
);

budgetRoutes.post(
  '/buildings/:buildingId/budgets/increments/apply',
  requireAuth,
  requirePermission('budget.update'),
  ensureBuildingAccess,
  validateBody(budgetIncrementsSchema),
  asyncHandler(async (request, response) => {
    const budget = await useCases.applyIncrements(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.json({ data: budget, meta: { requestId: request.id } });
  })
);
