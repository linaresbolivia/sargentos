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
  itemsReceivedAtGatehouse?: boolean;
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

    // If person is exiting the entire club, update any open AreaAccessLog sessions (Piscina / Gimnasio)
    if (data.actionType === 'EXIT' && data.personId) {
      try {
        const obsNote = data.itemsReceivedAtGatehouse
          ? 'Insumos (Llave/Toalla) entregados y recibidos en Caseta Principal'
          : 'Salida del Club registrada en Caseta Principal';

        await this.prisma.areaAccessLog.updateMany({
          where: {
            personId: data.personId,
            status: 'DENTRO'
          },
          data: {
            status: 'SALIO',
            exitTime: new Date(),
            observations: obsNote
          }
        });
      } catch (err) {
        console.error('Error auto-closing area logs upon gatehouse exit:', err);
      }
    }

    return log;
  }
}
