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
      firstName: data.firstName,
      lastName: data.lastName,
      documentId: data.documentId === '' ? null : data.documentId,
      phone: data.phone === '' ? null : data.phone,
      isActive: data.isActive,
    };

    if (data.email) {
      const normalizedEmail = data.email.toLowerCase().trim();
      if (normalizedEmail !== existingUser.email.toLowerCase().trim()) {
        const emailConflict = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (emailConflict && emailConflict.id !== id) {
          throw new Error(
            `El correo o nombre de usuario "${data.email}" ya está registrado para otro usuario (${emailConflict.firstName} ${emailConflict.lastName}).`
          );
        }
        updateData.email = normalizedEmail;
      }
    }

    if (data.password && data.password.trim() !== '') {
      updateData.passwordHash = await argon2.hash(data.password);
    }

    if (data.roles) {
      const expandedRoles = [...data.roles];
      if (expandedRoles.includes('USER') && !expandedRoles.includes('SOCIO')) {
        expandedRoles.push('SOCIO');
      } else if (expandedRoles.includes('SOCIO') && !expandedRoles.includes('USER')) {
        expandedRoles.push('USER');
      }

      const rolesToConnect = await this.prisma.role.findMany({
        where: { name: { in: expandedRoles } },
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
