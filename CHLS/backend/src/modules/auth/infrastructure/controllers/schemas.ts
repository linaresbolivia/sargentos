import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('El correo electrónico tiene un formato inválido.'),
    password: z.string().min(1, 'La contraseña debe tener al menos 1 caracter.'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().min(1, 'El usuario o correo electrónico es requerido.'),
    password: z.string().min(1, 'La contraseña es requerida.'),
  }),
});

