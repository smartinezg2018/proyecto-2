import { z } from 'zod';
import { MAINTENANCE_TYPES } from '../../domain/maintenanceCatalog.js';

export const registerMaintenanceSchema = z.object({
  maintenanceType: z.enum(MAINTENANCE_TYPES, {
    error: 'El tipo de mantenimiento debe ser preventivo o correctivo.'
  }),
  maintenanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha del mantenimiento debe tener el formato YYYY-MM-DD.'),
  description: z.string().trim().min(1, 'La descripción del mantenimiento es obligatoria.')
});
