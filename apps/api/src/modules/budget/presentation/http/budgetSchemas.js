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
