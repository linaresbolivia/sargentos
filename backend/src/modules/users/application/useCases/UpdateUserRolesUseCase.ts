import { PrismaClient } from '@prisma/client';
import { UpdateUserRolesDTO, UserDTO } from '../../domain/dtos/UserDTO';

export class UpdateUserRolesUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(userId: string, data: UpdateUserRolesDTO): Promise<UserDTO> {
    const rolesToConnect = await this.prisma.role.findMany({
      where: {
        name: { in: data.roles },
      },
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: rolesToConnect.map(r => ({ id: r.id })), // Overwrite with new roles array
        },
      },
      include: {
        roles: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      roles: user.roles.map(r => ({ id: r.id, name: r.name })),
    };
  }
}
