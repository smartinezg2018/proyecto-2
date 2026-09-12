import { z } from 'zod';
import { ASSET_STATUSES, ASSET_TYPES } from '../../domain/assetCatalog.js';

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
  acquisitionDate: dateSchema,
  acquisitionCost: z.number().nonnegative().nullable().optional(),
  acquisitionDocument: z.string().optional().nullable()
});

export const updateAssetSchema = z.object({
  name: z.string().trim().min(1, 'El campo name es obligatorio.'),
  description: z.string().optional().nullable(),
  type: z.enum(ASSET_TYPES, { error: 'El tipo de activo no es válido.' }),
  location: z.string().optional().nullable(),
  acquisitionDate: dateSchema
});

export const registerAcquisitionCostSchema = z.object({
  acquisitionCost: z
    .number({ error: 'El campo acquisitionCost debe ser numérico y no negativo.' })
    .nonnegative('El campo acquisitionCost debe ser numérico y no negativo.'),
  acquisitionDate: dateSchema,
  acquisitionDocument: z.string().optional().nullable()
});

export const changeAssetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES, {
    error:
      'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.'
  }),
  reason: z.string().trim().min(1, 'El motivo del cambio de estado es obligatorio.')
});
