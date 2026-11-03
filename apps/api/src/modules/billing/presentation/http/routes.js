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
  registerPaymentSchema,
  applyPaymentSchema,
  paymentIdSchema,
  interestSettingsSchema,
  adminFeeSchema,
  monthlySummaryQuerySchema,
  yearlySummaryQuerySchema,
  periodMarkSchema,
  assignChargeSchema,
  chargeStatusSchema,
  chargeIdSchema
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

billingRoutes.get(
  '/buildings/:buildingId/interest-settings',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const settings = await useCases.getInterestSettings(request.params.buildingId);
    response.json({ data: settings, meta: { requestId: request.id } });
  })
);

billingRoutes.put(
  '/buildings/:buildingId/interest-settings',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(interestSettingsSchema),
  asyncHandler(async (request, response) => {
    const result = await useCases.saveInterestSettings(
      request.params.buildingId,
      request.body.annualRate,
      request.user.id
    );
    response.json({ data: result, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/buildings/:buildingId/admin-fee',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const fee = await useCases.getAdminFee(request.params.buildingId);
    response.json({ data: fee, meta: { requestId: request.id } });
  })
);

billingRoutes.put(
  '/buildings/:buildingId/admin-fee',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(adminFeeSchema),
  asyncHandler(async (request, response) => {
    const fee = await useCases.saveAdminFee(
      request.params.buildingId,
      request.body.adminFee,
      request.user.id
    );
    response.json({ data: fee, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/buildings/:buildingId/monthly-summary',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsed = monthlySummaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || 'El periodo del resumen mensual no es válido.',
        400,
        'VALIDATION_ERROR'
      );
    }
    const summary = await useCases.getMonthlySummary(request.params.buildingId, parsed.data.period);
    response.json({ data: summary, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/buildings/:buildingId/yearly-summary',
  requireAuth,
  requirePermission('billing.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsed = yearlySummaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError('El año del resumen no es válido.', 400, 'VALIDATION_ERROR');
    }
    const summary = await useCases.getYearlySummary(request.params.buildingId, parsed.data.year);
    response.json({ data: summary, meta: { requestId: request.id } });
  })
);

billingRoutes.put(
  '/buildings/:buildingId/period-marks',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(periodMarkSchema),
  asyncHandler(async (request, response) => {
    const mark = await useCases.setPeriodMark(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.json({ data: mark, meta: { requestId: request.id } });
  })
);

billingRoutes.post(
  '/buildings/:buildingId/fines',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(assignChargeSchema),
  asyncHandler(async (request, response) => {
    const fine = await useCases.assignFine(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: fine, meta: { requestId: request.id } });
  })
);

billingRoutes.put(
  '/buildings/:buildingId/fines/:fineId/status',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(chargeStatusSchema),
  asyncHandler(async (request, response) => {
    const parsedId = chargeIdSchema.safeParse(request.params.fineId);
    if (!parsedId.success) {
      throw new AppError('La multa indicada no es válida.', 400, 'VALIDATION_ERROR');
    }
    const fine = await useCases.setFineStatus(
      request.params.buildingId,
      parsedId.data,
      request.body.status,
      request.user.id
    );
    response.json({ data: fine, meta: { requestId: request.id } });
  })
);

billingRoutes.post(
  '/buildings/:buildingId/extra-charges',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(assignChargeSchema),
  asyncHandler(async (request, response) => {
    const charge = await useCases.assignExtraCharge(
      request.params.buildingId,
      request.body,
      request.user.id
    );
    response.status(201).json({ data: charge, meta: { requestId: request.id } });
  })
);

billingRoutes.put(
  '/buildings/:buildingId/extra-charges/:chargeId/status',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  validateBody(chargeStatusSchema),
  asyncHandler(async (request, response) => {
    const parsedId = chargeIdSchema.safeParse(request.params.chargeId);
    if (!parsedId.success) {
      throw new AppError('El pago extra indicado no es válido.', 400, 'VALIDATION_ERROR');
    }
    const charge = await useCases.setExtraChargeStatus(
      request.params.buildingId,
      parsedId.data,
      request.body.status,
      request.user.id
    );
    response.json({ data: charge, meta: { requestId: request.id } });
  })
);

billingRoutes.post(
  '/buildings/:buildingId/interests/recalculate',
  requireAuth,
  requirePermission('billing.charge.create'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const calculation = await useCases.recalculateLateInterests(
      request.params.buildingId,
      request.user.id
    );
    response.json({ data: calculation, meta: { requestId: request.id } });
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
  '/buildings/:buildingId/payments/:paymentId/apply',
  requireAuth,
  requirePermission('billing.payment.apply'),
  ensureBuildingAccess,
  validateBody(applyPaymentSchema),
  asyncHandler(async (request, response) => {
    const parsedPaymentId = paymentIdSchema.safeParse(request.params.paymentId);
    if (!parsedPaymentId.success) {
      throw new AppError('El pago indicado no es válido.', 400, 'VALIDATION_ERROR');
    }
    const payment = await useCases.applyPayment(
      request.params.buildingId,
      parsedPaymentId.data,
      request.body,
      request.user.id
    );
    response.json({ data: payment, meta: { requestId: request.id } });
  })
);

billingRoutes.post(
  '/buildings/:buildingId/payments/:paymentId/sync-invoice-statuses',
  requireAuth,
  requirePermission('billing.payment.apply'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsedPaymentId = paymentIdSchema.safeParse(request.params.paymentId);
    if (!parsedPaymentId.success) {
      throw new AppError('El pago indicado no es válido.', 400, 'VALIDATION_ERROR');
    }
    const invoiceStatuses = await useCases.syncInvoiceStatusesAfterPaymentChange(
      request.params.buildingId,
      parsedPaymentId.data,
      request.user.id
    );
    response.json({ data: invoiceStatuses, meta: { requestId: request.id } });
  })
);

billingRoutes.get(
  '/buildings/:buildingId/payments/:paymentId/cash-receipt',
  requireAuth,
  requirePermission('billing.receipt.view'),
  ensureBuildingAccess,
  asyncHandler(async (request, response) => {
    const parsedPaymentId = paymentIdSchema.safeParse(request.params.paymentId);
    if (!parsedPaymentId.success) {
      throw new AppError('El pago indicado no es válido.', 400, 'VALIDATION_ERROR');
    }
    const receipt = await useCases.getCashReceipt(request.params.buildingId, parsedPaymentId.data);
    if (request.query.format === 'json') {
      response.json({ data: receipt, meta: { requestId: request.id } });
      return;
    }

    const invoiceLines = receipt.invoices
      .map(
        (invoice) =>
          `<li>Factura ${invoice.invoiceId}${invoice.period ? ` (${escapeHtml(invoice.period)})` : ''}: aplicado $${Number(invoice.appliedAmount).toFixed(2)} — saldo $${Number(invoice.balance ?? 0).toFixed(2)}</li>`
      )
      .join('');
    response
      .type('html')
      .send(
        `<article><h1>Recibo de caja N° ${receipt.receiptNumber}</h1><p>Apartamento: ${escapeHtml(
          receipt.unit?.number ?? ''
        )}</p><p>Fecha: ${escapeHtml(receipt.payment.paymentDate)}</p><p>Valor: $${Number(
          receipt.payment.amount
        ).toFixed(2)}</p><p>Medio: ${escapeHtml(
          receipt.payment.paymentMethod
        )}</p><p>Referencia: ${escapeHtml(
          receipt.payment.reference
        )}</p><ul>${invoiceLines}</ul><p>Saldo a favor: $${Number(receipt.creditBalance).toFixed(
          2
        )}</p></article>`
      );
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
