import { z } from 'zod';

export const createPersonSchema = z.object({
  identification: z.string().trim().min(1, 'La identificación del responsable es obligatoria.'),
  name: z.string().trim().min(1, 'El nombre del responsable es obligatorio.'),
  phone: z.string().optional().nullable(),
  email: z
    .union([z.email('El correo debe ser un email válido.'), z.literal('')])
    .optional()
    .nullable(),
  unitIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'Debe asociar el responsable a por lo menos un inmueble.')
});
