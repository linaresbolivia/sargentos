import { PrismaClient } from '@prisma/client';

export class DeleteUserUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(targetUserId: string, actingUserId?: string): Promise<{ success: boolean; message: string; id: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roles: true,
        person: true,
      },
    });

    if (!user) {
      throw new Error('El usuario especificado no existe o ya fue eliminado.');
    }

    if (actingUserId && actingUserId === targetUserId) {
      throw new Error('Operación denegada: No es posible eliminar su propia cuenta activa de SuperAdministrador.');
    }

    const isSuperAdmin = user.roles.some((r) => r.name === 'SUPER_ADMIN');
    if (isSuperAdmin) {
      const totalSuperAdmins = await this.prisma.user.count({
        where: {
          roles: {
            some: { name: 'SUPER_ADMIN' },
          },
        },
      });
      if (totalSuperAdmins <= 1) {
        throw new Error('Operación denegada: No se puede eliminar el único SuperAdministrador del sistema.');
      }
    }

    // Identificar usuario de respaldo para reasignar claves foráneas estrictas de auditoría histórica
    const fallbackUser = actingUserId
      ? await this.prisma.user.findUnique({ where: { id: actingUserId }, select: { id: true } })
      : await this.prisma.user.findFirst({
          where: {
            roles: { some: { name: 'SUPER_ADMIN' } },
            id: { not: targetUserId },
          },
          select: { id: true },
        });

    const fallbackUserId = fallbackUser?.id;

    await this.prisma.$transaction(async (tx) => {
      // 1. Desvincular registro de socio (Person) para preservar su ficha en el padrón
      await tx.person.updateMany({
        where: { userId: targetUserId },
        data: { userId: null },
      });

      // 2. Eliminar tokens de sesión activos
      await tx.userToken.deleteMany({
        where: { userId: targetUserId },
      });

      // 3. Desasignar trámites asignados en correspondencia
      await tx.routeSheet.updateMany({
        where: { currentAssigneeId: targetUserId },
        data: { currentAssigneeId: null },
      });

      // 4. Desasignar tickets PQRS asignados
      await tx.pqrsTicket.updateMany({
        where: { assignedToId: targetUserId },
        data: { assignedToId: null },
      });

      // 5. Reasignar referencias estrictas históricas (RouteSheets, Movements, OfficialCites)
      if (fallbackUserId) {
        await tx.routeSheet.updateMany({
          where: { createdById: targetUserId },
          data: { createdById: fallbackUserId },
        });

        await tx.hrMovement.updateMany({
          where: { sourceUserId: targetUserId },
          data: { sourceUserId: fallbackUserId },
        });

        await tx.officialCite.updateMany({
          where: { createdById: targetUserId },
          data: { createdById: fallbackUserId },
        });
      }

      // 6. Desconectar roles
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          roles: { set: [] },
        },
      });

      // 7. Eliminar usuario de forma permanente
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    return {
      success: true,
      message: `El usuario ${fullName} (${user.email}) ha sido eliminado permanentemente del sistema.`,
      id: targetUserId,
    };
  }
}
