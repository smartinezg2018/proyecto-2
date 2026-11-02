import { Router } from 'express';
import { validateBody } from '../../../../shared/middleware/validateBody.js';
import { requireAuth } from '../../../auth/presentation/http/middleware/requireAuth.js';
import { requirePermission } from '../../../auth/presentation/http/middleware/requirePermission.js';
import { ensureBuildingAccess } from '../../../auth/presentation/http/middleware/ensureBuildingAccess.js';
import { BillingRepository } from '../../infrastructure/billingRepository.js';
import { createBillingUseCases } from '../../application/billingUseCases.js';
import {
  generateExtraordinaryChargesSchema,
  generateRetroactiveChargesSchema,
  generateOrdinaryInvoicesSchema,
  listPortfolioQuerySchema,
  listInvoiceHistoryQuerySchema,
  invoiceIdSchema,
  registerPaymentSchema
} from './billingSchemas.js';
import { AppError } from '../../../../shared/errors/AppError.js';

export const billingRoutes = Router();
const useCases = createBillingUseCases(new BillingRepository());
const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function ensureInvoiceBuildingAccess(request, response, next) {
  try {
    const invoice = await new BillingRepository().findPaymentSlip(request.params.invoiceId);
    if (!invoice) {
      response
        .status(404)
        .json({ error: { code: 'INVOICE_NOT_FOUND', message: 'La factura no existe.' } });
      return;
    }
    request.params.buildingId = String(invoice.buildingId);
    return ensureBuildingAccess(request, response, next);
  } catch (error) {
    next(error);
  }
}

billingRoutes.get(
  '/buildings/:buildingId/portfolio',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsed = listPortfolioQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError('Los filtros de cartera no son válidos.', 400, 'VALIDATION_ERROR');
    }
    const portfolio = await useCases.listPortfolio(request.params.buildingId, parsed.data);
    response.json({ data: portfolio, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/buildings/:buildingId/invoices',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsed = listInvoiceHistoryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError(
        'Los filtros del historial de facturación no son válidos.',
        400,
        'VALIDATION_ERROR'
      );
    }
    const invoices = await useCases.listInvoiceHistory(request.params.buildingId, parsed.data);
    response.json({ data: invoices, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/buildings/:buildingId/invoices/:invoiceId',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsedInvoiceId = invoiceIdSchema.safeParse(request.params.invoiceId);
    if (!parsedInvoiceId.success) {
      throw new AppError('La factura indicada no es válida.', 400, 'VALIDATION_ERROR');
    }
    const invoice = await useCases.getInvoiceDetail(
      request.params.buildingId,
      parsedInvoiceId.data
    );
    response.json({ data: invoice, meta: { requestId: request.id } });
  })
);

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
    response.status(201).json({ data: invoices, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/invoices/:invoiceId/payment-slip',
  requireAuth,
  requirePermission('billing.invoice.view'),
  ensureInvoiceBuildingAccess,
  asyncHandler(async (request, response) => {
    const invoice = await useCases.generatePaymentSlip(request.params.invoiceId);
    const lines = invoice.items
      .map((item) => `<li>${escapeHtml(item.concept)}: $${item.amount.toFixed(2)}</li>`)
      .join('');
    response
      .type('html')
      .send(
        `<article><h1>Colilla de pago</h1><p>Apartamento: ${escapeHtml(
          invoice.unit.number
        )}</p><p>Vencimiento: ${escapeHtml(invoice.dueDate)}</p><ul>${lines}</ul><strong>Total: $${invoice.total.toFixed(
          2
        )}</strong><p>Referencia de pago: ${escapeHtml(invoice.paymentReference)}</p></article>`
      );
  })
);

billingRoutes.post(
  '/buildings/:buildingId/payments',
  requireAuth,
  requirePermission('billing.payment.create'),
  ensureBuildingAccess,
  validateBody(registerPaymentSchema),
  asyncHandler(async (request, response) => {
    const payment = await useCases.registerPayment(
      { ...request.body, buildingId: Number(request.params.buildingId) },
      request.user.id
    );
    response.status(201).json({ data: payment, meta: { requestId: request.id } });
  })
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

billingRoutes.post(
  '/buildings/:buildingId/charges/retroactive',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(generateRetroactiveChargesSchema),
  asyncHandler(async (request, response) => {
    const charges = await useCases.generateRetroactiveCharges(
      { ...request.body, buildingId: Number(request.params.buildingId) },
      request.user.id
    );
    response.status(201).json({ data: charges, meta: { requestId: request.id } });
  })
);
