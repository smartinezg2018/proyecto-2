import { z } from 'zod';
import { ASSET_STATUSES } from '../../domain/assetCatalog.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de adquisición debe tener el formato YYYY-MM-DD.');

export const createAssetSchema = z.object({
  code: z.string().trim().min(1, 'El campo code es obligatorio.'),
  name: z.string().trim().min(1, 'El campo name es obligatorio.'),
  description: z.string().optional().nullable(),
  type: z.string().trim().min(1, 'El campo type es obligatorio.'),
  status: z.enum(ASSET_STATUSES, {
    error:
      'El estado del activo no es válido. Use activo, en_mantenimiento, fuera_de_servicio o retirado.'
  }),
  location: z.string().optional().nullable(),
  acquisitionDate: dateSchema
});

export const createAssetTypeSchema = z.object({
  code: z.string().trim().min(1, 'El campo code es obligatorio.'),
  name: z.string().trim().min(1, 'El campo name es obligatorio.')
});

export const updateAssetTypeSchema = z.object({
  name: z.string().trim().min(1, 'El campo name es obligatorio.')
});

export const updateAssetSchema = z.object({
  name: z.string().trim().min(1, 'El campo name es obligatorio.'),
  description: z.string().optional().nullable(),
  type: z.string().trim().min(1, 'El campo type es obligatorio.'),
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
