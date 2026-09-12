import { z } from 'zod';
import { ASSET_COST_TYPES, ASSET_STATUSES, ASSET_TYPES } from '../../domain/assetCatalog.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de adquisición debe tener el formato YYYY-MM-DD.');

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

export const createAssetCostSchema = z.object({
  type: z.enum(ASSET_COST_TYPES, {
    error: 'El tipo de intervención no es válido. Use reparacion, mejora o mantenimiento.'
  }),
  amount: z
    .number({ error: 'El campo amount debe ser numérico y no negativo.' })
    .nonnegative('El campo amount debe ser numérico y no negativo.'),
  occurredOn: dateSchema,
  description: z.string().optional().nullable()
});

export const changeAssetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES, {
    error:
      'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.'
  }),
  reason: z.string().trim().min(1, 'El motivo del cambio de estado es obligatorio.')
});
