import { z } from 'zod';

export const CreateRouteSheetSchema = z.object({
  senderType: z.enum(['SOCIO', 'AREA_INTERNA', 'EXTERNO']).default('AREA_INTERNA'),
  personId: z.string().optional().nullable(),
  senderName: z.string().min(2, 'El nombre del remitente es obligatorio'),
  senderArea: z.string().optional().nullable(),
  senderPhone: z.string().optional().nullable(),
  senderEmail: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  senderDoc: z.string().optional().nullable(),
  
  cite: z.string().optional().nullable(),
  pageCount: z.number().int().min(1).default(1),
  reference: z.string().min(3, 'La referencia debe tener al menos 3 caracteres'),
  attachmentDescription: z.string().optional().nullable(),
  
  priority: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL'),
  initialArea: z.string().default('SECRETARIA_GENERAL'),
  
  // Optional initial instruction
  initialInstruction: z.string().optional().nullable(),
  initialTargetPerson: z.string().optional().nullable(),
  initialQuickStamp: z.string().optional().nullable(),
  initialCcAreas: z.array(z.string()).optional().default([]),
  initialCcPersons: z.string().optional().nullable(),
  
  // Optional AI suggestions
  aiSummary: z.string().optional().nullable(),
  suggestedArea: z.string().optional().nullable(),
});

export const AddMovementSchema = z.object({
  targetArea: z.string().min(2, 'El área de destino es obligatoria'),
  targetPersonName: z.string().optional().nullable(),
  instruction: z.string().min(2, 'La instrucción o proveído es obligatorio'),
  quickStamp: z.string().optional().nullable(),
  ccAreas: z.array(z.string()).optional().default([]),
  ccPersons: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  newStatus: z.enum([
    'RECIBIDO',
    'DERIVADO',
    'EN_PROCESO',
    'OBSERVADO',
    'SUBSANADO',
    'EN_APROBACION',
    'CONCLUIDO',
    'ANULADO'
  ]).optional().nullable(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum([
    'RECIBIDO',
    'DERIVADO',
    'EN_PROCESO',
    'OBSERVADO',
    'SUBSANADO',
    'EN_APROBACION',
    'CONCLUIDO',
    'ANULADO'
  ]),
  note: z.string().optional().nullable(),
  currentArea: z.string().optional().nullable(),
});

export type CreateRouteSheetInput = z.infer<typeof CreateRouteSheetSchema>;
export type AddMovementInput = z.infer<typeof AddMovementSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
