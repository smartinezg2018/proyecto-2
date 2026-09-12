import { z } from 'zod';
import { PROPERTY_KINDS } from '../../domain/propertyKinds.js';
import { UNIT_STATUSES } from '../../domain/unitStatuses.js';

export const createUnitSchema = z.object({
  number: z.string().trim().min(1, 'El número del inmueble es obligatorio.'),
  tower: z.string().optional().nullable(),
  kind: z
    .enum(PROPERTY_KINDS, {
      error: 'El tipo de inmueble no es válido. Use apartamento o parqueadero.'
    })
    .optional()
    .default('apartamento'),
  coefficient: z.coerce
    .number({ error: 'El coeficiente debe ser un número entre 0 y 100.' })
    .min(0, 'El coeficiente debe ser un número entre 0 y 100.')
    .max(100, 'El coeficiente debe ser un número entre 0 y 100.'),
  status: z.enum(UNIT_STATUSES, {
    error: 'El estado del inmueble no es válido. Use ocupada, desocupada o inhabitada.'
  })
});
