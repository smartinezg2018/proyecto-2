import { z } from 'zod';

export const budgetYearSchema = z.coerce.number().int().min(2000).max(2100);

export const copyBudgetFromExecutionSchema = z.object({
  sourceYear: budgetYearSchema,
  targetYear: budgetYearSchema,
  lines: z
    .array(
      z.object({
        sourceLineId: z.coerce.number().int().positive(),
        amount: z.coerce.number().nonnegative().multipleOf(0.01)
      })
    )
    .min(1)
});

export const budgetReportQuerySchema = z.object({
  year: budgetYearSchema,
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  lineCode: z.string().trim().max(50).optional(),
  format: z.enum(['json', 'csv']).optional()
});
