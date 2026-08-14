import { PrismaClient } from '@prisma/client';
import { UserDTO } from '../../domain/dtos/UserDTO';

export class GetUsersUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(): Promise<UserDTO[]> {
    const users = await this.prisma.user.findMany({
      include: {
        roles: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName || user.person?.firstName || '',
      lastName: user.lastName || user.person?.lastName || '',
      documentId: user.documentId,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.roles.map(r => ({ id: r.id, name: r.name })),
    }));
  }
}
