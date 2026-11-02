import { z } from 'zod';

export const budgetYearSchema = z.coerce.number().int().min(2000).max(2100);

export const ensureDraftBudgetSchema = z.object({
  year: budgetYearSchema,
  lines: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(255),
        classification: z.enum(['ingreso', 'gasto']),
        amount: z.coerce.number().nonnegative()
      })
    )
    .optional()
    .default([])
});

export const budgetIncrementsSchema = z.object({
  year: budgetYearSchema,
  generalPercent: z.coerce.number().min(-100).default(0),
  linePercents: z
    .array(
      z.object({
        lineId: z.coerce.number().int().positive(),
        percent: z.coerce.number().min(-100)
      })
    )
    .optional()
    .default([])
});
