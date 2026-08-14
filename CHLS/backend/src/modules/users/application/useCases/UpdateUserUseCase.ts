import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { UpdateUserDTO, UserDTO } from '../../domain/dtos/UserDTO';

export class UpdateUserUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(id: string, data: UpdateUserDTO): Promise<UserDTO> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    const updateData: any = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      documentId: data.documentId === '' ? null : data.documentId,
      phone: data.phone === '' ? null : data.phone,
      isActive: data.isActive,
    };

    if (data.password && data.password.trim() !== '') {
      updateData.passwordHash = await argon2.hash(data.password);
    }

    if (data.roles) {
      const rolesToConnect = await this.prisma.role.findMany({
        where: { name: { in: data.roles } },
      });

      updateData.roles = {
        set: rolesToConnect.map(r => ({ id: r.id })),
      };
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      key => updateData[key] === undefined && delete updateData[key]
    );

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      documentId: user.documentId,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.roles.map(r => ({ id: r.id, name: r.name })),
    };
  }
}
