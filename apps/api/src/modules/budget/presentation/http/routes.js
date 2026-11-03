import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { AppError } from '../../../../shared/errors/AppError.js';
import { BudgetRepository } from '../../infrastructure/budgetRepository.js';
import { createBudgetUseCases } from '../../application/budgetUseCases.js';
import {
  budgetYearSchema,
  copyBudgetFromExecutionSchema,
  registerExecutionSchema
} from './budgetSchemas.js';

export const budgetRoutes = Router();
const useCases = createBudgetUseCases(new BudgetRepository());
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

budgetRoutes.get(
  '/buildings/:buildingId/executions/summary',
  requireAuth,
  requirePermission('budget.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsedYear = budgetYearSchema.safeParse(request.query.year);
    if (!parsedYear.success) {
      throw new AppError('El año consultado no es válido.', 400, 'VALIDATION_ERROR');
    }
    const summary = await useCases.getPreviousExecution(request.params.buildingId, parsedYear.data);
    response.json({ data: summary, meta: { requestId: request.id } });
  })
);

budgetRoutes.post(
  '/buildings/:buildingId/budgets/from-execution',
  requireAuth,
  requirePermission('budget.update'),
  ensureBuildingAccess,
  validateBody(copyBudgetFromExecutionSchema),
  asyncHandler(async (request, response) => {
    const budget = await useCases.createFromExecution(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: budget, meta: { requestId: request.id } });
  })
);

budgetRoutes.get(
  '/buildings/:buildingId/budget-lines',
  requireAuth,
  requirePermission('budget.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsedYear = budgetYearSchema.safeParse(request.query.year);
    if (!parsedYear.success) {
      throw new AppError('El año consultado no es válido.', 400, 'VALIDATION_ERROR');
    }
    const lines = await useCases.listBudgetLines(request.params.buildingId, parsedYear.data);
    response.json({ data: lines, meta: { requestId: request.id } });
  })
);

budgetRoutes.post(
  '/buildings/:buildingId/executions',
  requireAuth,
  requirePermission('budget.update'),
  ensureBuildingAccess,
  validateBody(registerExecutionSchema),
  asyncHandler(async (request, response) => {
    const result = await useCases.registerExecution(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: result, meta: { requestId: request.id } });
  })
);
