import { z } from 'zod';

const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El periodo debe tener el formato YYYY-MM.');
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD.');

export const generateOrdinaryInvoicesSchema = z.object({
  period: periodSchema,
  unitIds: z.array(z.coerce.number().int().positive()).min(1),
  concept: z.string().trim().min(1).max(255),
  baseAmount: z.coerce.number().positive(),
  dueDate: dateSchema
});

export const generateExtraordinaryChargesSchema = z.object({
  unitIds: z.array(z.coerce.number().int().positive()).min(1),
  originPeriod: periodSchema,
  startPeriod: periodSchema,
  concept: z.string().trim().min(1).max(255),
  totalAmount: z.coerce.number().positive(),
  installments: z.coerce.number().int().positive().max(120),
  approvalReference: z.string().trim().min(1).max(255)
});

export const generateRetroactiveChargesSchema = z.object({
  unitIds: z.array(z.coerce.number().int().positive()).min(1),
  originPeriod: periodSchema,
  startPeriod: periodSchema,
  concept: z.string().trim().min(1).max(255),
  totalAmount: z.coerce.number().positive(),
  installments: z.coerce.number().int().positive().max(120)
});

export const listPortfolioQuerySchema = z.object({
  unitId: z.coerce.number().int().positive().optional(),
  period: periodSchema.optional(),
  status: z.enum(['al_dia', 'pendiente', 'en_mora']).optional()
});

export const listInvoiceHistoryQuerySchema = z.object({
  unitId: z.coerce.number().int().positive(),
  period: periodSchema.optional(),
  status: z.enum(['pendiente', 'parcialmente_pagada', 'pagada']).optional()
});

export const invoiceIdSchema = z.coerce.number().int().positive();
