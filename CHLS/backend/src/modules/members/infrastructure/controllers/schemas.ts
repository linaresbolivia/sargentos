import { z } from 'zod';

export const accessCheckSchema = z.object({
  body: z.object({
    membershipNumber: z
      .string()
      .min(1, 'El número de membresía es requerido.')
      .max(20, 'El número de membresía no puede exceder los 20 caracteres.'),
  }),
});
