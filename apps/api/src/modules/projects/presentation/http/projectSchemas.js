import { z } from 'zod';
import { isCalendarDate } from '../../../assets/domain/calendarDate.js';
import { PROJECT_TYPES } from '../../domain/projectCatalog.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD.')
  .refine(isCalendarDate, 'La fecha no es válida.');

export const registerProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre del proyecto es obligatorio.').max(200),
    objective: z.string().trim().min(1, 'El objetivo del proyecto es obligatorio.').max(5000),
    projectType: z.enum(PROJECT_TYPES, {
      error: 'El tipo de proyecto debe ser obra, mejora, mantenimiento u otro.'
    }),
    budget: z.number().nonnegative('El presupuesto no puede ser negativo.').max(9999999999999.99),
    startDate: dateSchema,
    endDate: dateSchema,
    responsible: z.string().trim().min(1, 'El responsable del proyecto es obligatorio.').max(150),
    approvalReference: z
      .string()
      .trim()
      .min(1, 'La referencia de aprobación es obligatoria.')
      .max(255)
  })
  .refine((input) => input.endDate >= input.startDate, {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
    path: ['endDate']
  });

export const registerProjectQuoteSchema = z.object({
  supplierId: z.number().int().positive('El proveedor es obligatorio.'),
  amount: z
    .number()
    .nonnegative('El valor de la cotización no puede ser negativo.')
    .max(9999999999999.99),
  validUntil: dateSchema,
  scope: z.string().trim().min(1, 'El alcance es obligatorio.').max(5000),
  conditions: z.string().trim().min(1, 'Las condiciones son obligatorias.').max(5000),
  deliveryDays: z
    .number()
    .int()
    .positive('El tiempo de ejecución debe ser un número entero de días mayor que cero.')
    .max(3650),
  documentRef: z.string().trim().max(255).optional().nullable()
});

export const selectProjectQuoteSchema = z.object({
  quoteId: z.number().int().positive('La cotización es obligatoria.'),
  justification: z
    .string()
    .trim()
    .min(1, 'La justificación de la selección es obligatoria.')
    .max(5000)
});
