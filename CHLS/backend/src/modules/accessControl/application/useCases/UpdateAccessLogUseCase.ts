import { PrismaClient } from '@prisma/client';

export interface UpdateAccessLogDTO {
  id: string;
  actionType?: 'ENTRY' | 'EXIT';
  method?: string;
  vehiclePlate?: string;
  observation?: string;
}

export class UpdateAccessLogUseCase {
  constructor(private prisma: PrismaClient) {}

  public async execute(data: UpdateAccessLogDTO) {
    const log = await this.prisma.accessLog.findUnique({
      where: { id: data.id }
    });

    if (!log) {
      throw new Error('Registro de acceso no encontrado');
    }

    const fifteenMinutes = 15 * 60 * 1000;
    const now = Date.now();
    const logTime = log.timestamp.getTime();

    if (now - logTime > fifteenMinutes) {
      throw new Error('Tiempo de edición expirado (máximo 15 minutos)');
    }

    const finalMethod = data.method !== undefined ? data.method : log.method;
    let finalPlate: string | null | undefined = data.vehiclePlate !== undefined ? data.vehiclePlate : undefined;

    if (finalMethod === 'TAXI' || finalMethod === 'PEDESTRIAN') {
      finalPlate = null;
    } else if (finalPlate === "") {
      finalPlate = null;
    }

    const updatedLog = await this.prisma.accessLog.update({
      where: { id: data.id },
      data: {
        actionType: data.actionType !== undefined ? data.actionType : undefined,
        method: data.method !== undefined ? data.method : undefined,
        vehiclePlate: finalPlate,
        observation: data.observation !== undefined ? data.observation : undefined,
      }
    });

    return updatedLog;
  }
}
