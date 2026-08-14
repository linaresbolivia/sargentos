import { PrismaClient } from '@prisma/client';

export interface RegisterAccessLogDTO {
  personId: string;
  gate: string;
  method: string;
  status: 'GRANTED' | 'DENIED';
  actionType: 'ENTRY' | 'EXIT';
  reason?: string;
  observation?: string;
  vehiclePlate?: string;
  personType?: string;
}

export class RegisterAccessLogUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(data: RegisterAccessLogDTO) {
    const person = await this.prisma.person.findUnique({
      where: { id: data.personId },
      select: { personType: true }
    });

    const log = await this.prisma.accessLog.create({
      data: {
        personId: data.personId,
        gate: data.gate,
        method: data.method,
        actionType: data.actionType,
        status: data.status,
        reason: data.reason,
        observation: data.observation,
        vehiclePlate: data.vehiclePlate,
        personType: data.personType || person?.personType || 'SOCIO',
      },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            documentId: true,
          }
        }
      }
    });

    return log;
  }
}
