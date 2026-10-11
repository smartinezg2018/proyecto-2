import { z } from 'zod';

export const createInsuranceQuoteSchema = z.object({
  insurer: z.string().trim().min(1, 'La aseguradora es obligatoria.'),
  coverage: z.string().trim().min(1, 'La cobertura es obligatoria.'),
  premium: z.coerce.number().nonnegative(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentRef: z.string().trim().max(255).optional().nullable()
});