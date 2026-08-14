import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { CreateUserDTO, UserDTO } from '../../domain/dtos/UserDTO';

export class CreateUserUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(data: CreateUserDTO): Promise<UserDTO> {
    const passwordHash = await argon2.hash(data.password || 'password123');

    // Find the roles to connect
    const rolesToConnect = await this.prisma.role.findMany({
      where: {
        name: { in: data.roles },
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        documentId: data.documentId === '' ? null : data.documentId,
        phone: data.phone === '' ? null : data.phone,
        isActive: data.isActive !== undefined ? data.isActive : true,
        roles: {
          connect: rolesToConnect.map(r => ({ id: r.id })),
        },
      },
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
