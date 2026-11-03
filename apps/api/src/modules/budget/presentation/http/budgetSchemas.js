import { z } from 'zod';

export const budgetYearSchema = z.coerce.number().int().min(2000).max(2100);

export const expenseProjectionSchema = z.object({
  year: budgetYearSchema,
  month: z.preprocess(
    (value) => (value == null || value === '' ? undefined : value),
    z.coerce.number().int().min(1).max(12).optional()
  ),
  increments: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        percent: z.coerce.number().min(-100).max(1000)
      })
    )
    .optional()
    .default([]),
  overrides: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        amount: z.coerce.number().nonnegative().multipleOf(0.01)
      })
    )
    .optional()
    .default([]),
  manualLines: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(255),
        amount: z.coerce.number().nonnegative().multipleOf(0.01).optional(),
        months: z
          .array(
            z.object({
              month: z.coerce.number().int().min(1).max(12),
              amount: z.coerce.number().nonnegative().multipleOf(0.01)
            })
          )
          .max(12)
          .optional()
      })
    )
    .optional()
    .default([])
});

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

export const registerAnnualBudgetSchema = z.object({
  year: budgetYearSchema,
  status: z.enum(['borrador', 'aprobado']).optional().default('borrador'),
  lines: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(255),
        classification: z.enum(['ingreso', 'gasto']),
        amount: z.coerce.number().nonnegative().multipleOf(0.01)
      })
    )
    .min(1)
});

export const updateBudgetStatusSchema = z.object({
  status: z.enum(['borrador', 'aprobado', 'cerrado'])
});

export const registerExecutionSchema = z.object({
  budgetLineId: z.coerce.number().int().positive(),
  executionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD.'),
  amount: z.coerce.number().positive().multipleOf(0.01),
  description: z.string().trim().max(255).optional(),
  extraordinary: z.boolean().optional().default(false)
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
