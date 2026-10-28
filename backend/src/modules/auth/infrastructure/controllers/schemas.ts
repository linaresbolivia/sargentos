import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('El correo electrónico tiene un formato inválido.'),
    password: z.string().min(1, 'La contraseña debe tener al menos 1 caracter.'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    username: z.string().optional(),
    password: z.string().min(1, 'La contraseña es requerida.'),
  }).refine((data) => !!(data.email || data.username), {
    message: 'Debe ingresar su código de socio, usuario o correo electrónico.',
    path: ['email'],
  }),
});

