import { z } from 'zod';
import { isCalendarDate } from '../../../assets/domain/calendarDate.js';

const claimDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD.')
  .refine(isCalendarDate, 'La fecha no es válida.');

export const createInsuranceClaimSchema = z
  .object({
    policyId: z.number().int().positive(),
    claimDate: claimDateSchema,
    description: z.string().trim().min(1).max(5000),
    status: z.enum(['reportada', 'en_revision', 'aprobada', 'rechazada', 'indemnizada']),
    result: z.string().trim().max(5000).nullable().optional().default(null),
    claimedAmount: z.number().nonnegative().max(9999999999999.99),
    indemnityAmount: z
      .number()
      .nonnegative()
      .max(9999999999999.99)
      .nullable()
      .optional()
      .default(null),
    resolvedAt: claimDateSchema.nullable().optional().default(null),
    documentRefs: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
    assetIds: z.array(z.number().int().positive()).min(1).max(100)
  })
  .refine((input) => !input.resolvedAt || input.resolvedAt >= input.claimDate, {
    message: 'La fecha de resolución no puede ser anterior al siniestro.',
    path: ['resolvedAt']
  });

export const listInsuranceClaimsQuerySchema = z.object({
  policyId: z.coerce.number().int().positive().optional(),
  assetId: z.coerce.number().int().positive().optional()
});

export const insuranceAlertSettingsSchema = z.object({
  alertDays: z.number().int().min(0).max(365)
});
const coverageItem = z.string().trim().min(1).max(200);
const policyDates = {
  validFrom: z.iso.date(),
  validUntil: z.iso.date()
};
const laterEndDate = (input) => input.validUntil > input.validFrom;

export const listInsurancePoliciesQuerySchema = z.object({
  insurer: z.string().trim().min(1).max(150).optional(),
  status: z.enum(['Vigente', 'Próxima a vencer', 'Vencida', 'Pendiente de inicio']).optional(),
  validUntil: claimDateSchema.optional()
});

export const createInsurancePolicySchema = z
  .object({
    number: z.string().trim().min(1).max(100),
    insurer: z.string().trim().min(1).max(150),
    coverage: z.string().trim().min(1).max(5000).optional(),
    coverages: z.array(coverageItem).min(1).max(20).optional(),
    insuredValue: z.number().nonnegative().max(9999999999999.99),
    assetIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
    ...policyDates
  })
  .refine((input) => Boolean(input.coverage) || Boolean(input.coverages?.length), {
    message: 'Debe indicar al menos una cobertura.',
    path: ['coverages']
  })
  .refine(laterEndDate, {
    message: 'La fecha final debe ser posterior a la inicial.',
    path: ['validUntil']
  });

export const updateInsurancePolicySchema = z
  .object({
    number: z.string().trim().min(1).max(100),
    insurer: z.string().trim().min(1).max(150),
    coverages: z.array(coverageItem).min(1).max(20),
    insuredValue: z.number().nonnegative().max(9999999999999.99),
    assetIds: z.array(z.number().int().positive()).min(1).max(100),
    ...policyDates
  })
  .refine(laterEndDate, {
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
