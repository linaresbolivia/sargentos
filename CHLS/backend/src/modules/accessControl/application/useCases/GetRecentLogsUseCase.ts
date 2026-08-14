import { PrismaClient } from '@prisma/client';

export class GetRecentLogsUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(limit: number = 10, personId?: string, startDate?: string, endDate?: string) {
    const whereClause: any = {};
    if (personId) whereClause.personId = personId;
    
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        whereClause.timestamp.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        whereClause.timestamp.lte = end;
      }
    }

    const logs = await this.prisma.accessLog.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit,
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            documentId: true,
            photoUrl: true,
          }
        },
        guest: {
          include: {
            host: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    return logs.map((log: any) => {
      let logFullName = 'Desconocido';
      let logDocumentId = '';
      let logPhotoUrl = null;
      let logObservation = log.observation;
      let hostName = null;
      let isGuest = false;

      if (log.guest) {
        isGuest = true;
        logFullName = `${log.guest.firstName} ${log.guest.lastName}`;
        logDocumentId = log.guest.documentId || '';
        hostName = log.guest.host ? `${log.guest.host.firstName} ${log.guest.host.lastName}` : 'Socio Desconocido';
      } else if (log.person) {
        logFullName = `${log.person.firstName} ${log.person.lastName}`;
        logDocumentId = log.person.documentId || '';
        logPhotoUrl = log.person.photoUrl || null;
      }

      return {
        id: log.id,
        timestamp: log.timestamp,
        personId: log.personId || log.guestId,
        fullName: logFullName,
        documentId: logDocumentId,
        photoUrl: logPhotoUrl,
      status: log.status,
      gate: log.gate,
      method: log.method,
        reason: log.reason,
        observation: logObservation,
        vehiclePlate: log.vehiclePlate,
        actionType: log.actionType,
        personType: log.personType,
        isGuest,
        hostName,
      };
    });
  }
}
