import { z } from 'zod';

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
