import { z } from 'zod';
import { isCalendarDate } from '../../../assets/domain/calendarDate.js';

const claimDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD.')
  .refine(isCalendarDate, 'La fecha no es válida.');

export const createInsuranceClaimSchema = z.object({
  policyId: z.number().int().positive(),
  claimDate: claimDateSchema,
  description: z.string().trim().min(1).max(5000),
  status: z.enum(['reportada', 'en_revision', 'aprobada', 'rechazada', 'indemnizada']),
  claimedAmount: z.number().nonnegative().max(9999999999999.99),
  documentRefs: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  assetIds: z.array(z.number().int().positive()).min(1).max(100)
});

export const insuranceAlertSettingsSchema = z.object({
  alertDays: z.number().int().min(0).max(365)
});
export const createInsurancePolicySchema = z
  .object({
    number: z.string().trim().min(1).max(100),
    insurer: z.string().trim().min(1).max(150),
    coverage: z.string().trim().min(1).max(5000),
    insuredValue: z.number().nonnegative().max(9999999999999.99),
    validFrom: z.iso.date(),
    validUntil: z.iso.date()
  })
  .refine((input) => input.validUntil > input.validFrom, {
    message: 'La fecha final debe ser posterior a la inicial.',
    path: ['validUntil']
  });

export const createInsuranceQuoteSchema = z.object({
  insurer: z.string().trim().min(1, 'La aseguradora es obligatoria.'),
  coverage: z.string().trim().min(1, 'La cobertura es obligatoria.'),
  premium: z.coerce.number().nonnegative(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentRef: z.string().trim().max(255).optional().nullable()
});
