import { z } from 'zod';
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES } from '../../domain/maintenanceCatalog.js';
import { MAINTENANCE_FREQUENCIES } from '../../domain/maintenanceSchedule.js';

function costSchema(label) {
  return z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce
      .number({ error: `El ${label} debe ser numérico.` })
      .nonnegative(`El ${label} no puede ser negativo.`)
      .nullable()
      .optional()
  );
}

const estimatedCostSchema = costSchema('costo estimado');
const actualCostSchema = costSchema('costo real');

export const registerMaintenanceSchema = z
  .object({
    estimatedCost: estimatedCostSchema,
    actualCost: actualCostSchema,
    maintenanceType: z.enum(MAINTENANCE_TYPES, {
      error: 'El tipo de mantenimiento debe ser preventivo o correctivo.'
    }),
    maintenanceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha del mantenimiento debe tener el formato YYYY-MM-DD.'),
    frequency: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z
        .enum(MAINTENANCE_FREQUENCIES, {
          error: 'La frecuencia del mantenimiento preventivo no es válida.'
        })
        .optional()
    ),
    responsible: z.string().trim().optional(),
    nextExecutionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La próxima fecha de ejecución debe tener el formato YYYY-MM-DD.')
      .optional()
      .nullable(),
    description: z.string().trim().optional(),
    failure: z.string().trim().optional(),
    cause: z.string().trim().optional(),
    actionsTaken: z.string().trim().optional()
  })
  .superRefine((value, context) => {
    if (value.maintenanceType === 'preventivo') {
      if (!value.description || value.description === '') {
        context.addIssue({
          code: 'custom',
          path: ['description'],
          message: 'La descripción del mantenimiento es obligatoria.'
        });
      }
      if (value.frequency && (!value.responsible || value.responsible === '')) {
        context.addIssue({
          code: 'custom',
          path: ['responsible'],
          message: 'El responsable del mantenimiento preventivo es obligatorio.'
        });
      }
      return;
    }

    if (value.frequency) {
      context.addIssue({
        code: 'custom',
        path: ['frequency'],
        message: 'Solo los mantenimientos preventivos se pueden programar con frecuencia.'
      });
    }

    if (value.maintenanceType === 'correctivo') {
      if (!value.failure || value.failure === '') {
        context.addIssue({
          code: 'custom',
          path: ['failure'],
          message: 'La falla del mantenimiento correctivo es obligatoria.'
        });
      }
      if (!value.cause || value.cause === '') {
        context.addIssue({
          code: 'custom',
          path: ['cause'],
          message: 'La causa del mantenimiento correctivo es obligatoria.'
        });
      }
      if (!value.actionsTaken || value.actionsTaken === '') {
        context.addIssue({
          code: 'custom',
          path: ['actionsTaken'],
          message: 'Las acciones ejecutadas del mantenimiento correctivo son obligatorias.'
        });
      }
    }
  });

export const updateMaintenanceCostsSchema = z
  .object({
    estimatedCost: estimatedCostSchema,
    actualCost: actualCostSchema
  })
  .refine((value) => value.estimatedCost !== undefined || value.actualCost !== undefined, {
    message: 'Debe enviar el costo estimado o el costo real del mantenimiento.'
  });

export const maintenanceAlertSettingsSchema = z.object({
  alertDays: z.number().int().min(0).max(365)
});

export const changeMaintenanceStatusSchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES, {
    error:
      'El estado del mantenimiento no es válido. Use programado, en_ejecucion, finalizado o cancelado.'
  })
});

export const assignMaintenanceSupplierSchema = z
  .object({
    supplierId: z.coerce.number().int().positive().optional().nullable(),
    identification: z.string().trim().optional().nullable(),
    name: z.string().trim().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z
      .union([z.email('El correo debe ser un email válido.'), z.literal('')])
      .optional()
      .nullable(),
    documentRef: z.string().trim().max(255).optional().nullable()
  })
  .superRefine((value, context) => {
    if (value.supplierId) return;
    if (!value.name) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'El nombre del proveedor es obligatorio.'
      });
    }
  });

export const createMaintenanceQuoteSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  amount: z.coerce.number().nonnegative(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La vigencia debe tener el formato YYYY-MM-DD.'),
  documentRef: z.string().trim().max(255).optional().nullable(),
  scope: z.string().trim().min(1, 'El alcance es obligatorio.'),
  conditions: z.string().trim().min(1, 'Las condiciones son obligatorias.')
});
