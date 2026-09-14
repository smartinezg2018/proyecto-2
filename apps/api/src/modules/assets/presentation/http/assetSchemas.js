import { z } from 'zod';
import {
  ASSET_COST_TYPES,
  ASSET_STATUSES,
  ASSET_TYPES,
  OPERATING_COST_TYPES,
  SUPPLIER_ROLES
} from '../../domain/assetCatalog.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD.');

const amountSchema = z.coerce
  .number({ error: 'El valor del costo debe ser numérico.' })
  .nonnegative('El valor del costo no puede ser negativo.');

export const createAssetSchema = z.object({
  code: z.string().trim().min(1, 'El campo code es obligatorio.'),
  name: z.string().trim().min(1, 'El campo name es obligatorio.'),
  description: z.string().optional().nullable(),
  type: z.enum(ASSET_TYPES, { error: 'El tipo de activo no es válido.' }),
  status: z.enum(ASSET_STATUSES, {
    error:
      'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.'
  }),
  location: z.string().optional().nullable(),
  acquisitionDate: dateSchema
});

export const updateAssetSchema = z.object({
  name: z.string().trim().min(1, 'El campo name es obligatorio.'),
  description: z.string().optional().nullable(),
  type: z.enum(ASSET_TYPES, { error: 'El tipo de activo no es válido.' }),
  location: z.string().optional().nullable(),
  acquisitionDate: dateSchema
});

export const changeAssetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES, {
    error:
      'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.'
  }),
  reason: z.string().trim().min(1, 'El motivo del cambio de estado es obligatorio.')
});

export const createSupplierSchema = z.object({
  identification: z.string().trim().min(1, 'La identificación del proveedor es obligatoria.'),
  name: z.string().trim().min(1, 'El nombre del proveedor es obligatorio.'),
  phone: z.string().optional().nullable(),
  email: z
    .union([z.email('El correo debe ser un email válido.'), z.literal('')])
    .optional()
    .nullable()
});

export const assignSupplierSchema = z
  .object({
    supplierId: z.coerce.number().int().positive().optional().nullable(),
    identification: z.string().trim().optional().nullable(),
    name: z.string().trim().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z
      .union([z.email('El correo debe ser un email válido.'), z.literal('')])
      .optional()
      .nullable(),
    role: z.enum(SUPPLIER_ROLES).optional().default('suministro')
  })
  .superRefine((value, context) => {
    if (value.supplierId) {
      return;
    }

    if (!value.identification || value.identification.trim() === '') {
      context.addIssue({
        code: 'custom',
        path: ['identification'],
        message: 'Seleccione un proveedor existente o indique la identificación del nuevo.'
      });
    }

    if (!value.name || value.name.trim() === '') {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'El nombre del proveedor es obligatorio cuando se registra uno nuevo.'
      });
    }
  });

export const acquisitionCostSchema = z.object({
  amount: amountSchema,
  costDate: dateSchema,
  documentRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const operatingCostSchema = z.object({
  costType: z.enum(OPERATING_COST_TYPES, {
    error: 'El tipo de costo debe ser reparacion, mejora o mantenimiento.'
  }),
  amount: amountSchema,
  costDate: dateSchema,
  documentRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const costFilterTypes = ASSET_COST_TYPES;