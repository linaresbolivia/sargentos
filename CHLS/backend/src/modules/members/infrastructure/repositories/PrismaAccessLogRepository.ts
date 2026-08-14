import { IAccessLogRepository } from '../../domain/IAccessLogRepository';
import { AccessLog } from '../../domain/AccessLog';
import { prisma } from '@shared/infrastructure/prisma';

export class PrismaAccessLogRepository implements IAccessLogRepository {
  public async save(accessLog: any): Promise<void> {
    const data = {
      personId: accessLog.memberProfileId || null,
      gate: "Puerta Principal",
      method: "QR",
      timestamp: accessLog.timestamp,
      status: accessLog.status,
      reason: accessLog.reason,
    };

    await prisma.accessLog.create({
      data: {
        id: accessLog.id,
        ...data,
      },
    });
  }

  public async getRecentLogs(limit: number): Promise<any[]> {
    return prisma.accessLog.findMany({
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      include: {
        person: true,
      },
    });
  }
}
