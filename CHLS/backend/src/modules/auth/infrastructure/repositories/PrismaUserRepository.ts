import { IUserRepository } from '../../domain/IUserRepository';
import { User } from '../../domain/User';
import { Email } from '../../domain/Email';
import { UserPassword } from '../../domain/UserPassword';
import { Role } from '../../domain/Role';
import { prisma } from '@shared/infrastructure/prisma';
import { User as PrismaUser, Role as PrismaRole, Permission as PrismaPermission } from '@prisma/client';

type PrismaUserWithRoles = PrismaUser & {
  roles: (PrismaRole & {
    permissions: PrismaPermission[];
  })[];
};

export class PrismaUserRepository implements IUserRepository {
  private toDomain(raw: PrismaUserWithRoles): User {
    const emailResult = Email.create(raw.email);
    const passwordResult = UserPassword.create(raw.passwordHash);

    if (emailResult.isFailure || passwordResult.isFailure) {
      throw new Error(`Error de mapeo de base de datos a dominio para usuario ${raw.id}`);
    }

    const roles = raw.roles.map((r) => {
      const roleResult = Role.create(
        {
          name: r.name,
          description: r.description || undefined,
          permissions: r.permissions.map((p) => p.name),
        },
        r.id
      );
      if (roleResult.isFailure) {
        throw new Error(`Error de mapeo de base de datos a dominio para rol ${r.name}`);
      }
      return roleResult.getValue();
    });

    const userResult = User.create(
      {
        email: emailResult.getValue(),
        password: passwordResult.getValue(),
        firstName: raw.firstName,
        lastName: raw.lastName,
        isActive: raw.isActive,
        roles,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id
    );

    if (userResult.isFailure) {
      throw new Error(`Error de mapeo del modelo de dominio del usuario: ${userResult.getError()}`);
    }

    return userResult.getValue();
  }

  public async exists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const raw = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!raw) return null;
    return this.toDomain(raw);
  }

  public async findById(id: string): Promise<User | null> {
    const raw = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!raw) return null;
    return this.toDomain(raw);
  }

  public async save(user: User): Promise<void> {
    const data = {
      email: user.email.value,
      passwordHash: user.password.value,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      updatedAt: new Date(),
    };

    // Find the roles in the database by name to connect them
    const roles = await prisma.role.findMany({
      where: {
        name: {
          in: user.roles.map((r) => r.name),
        },
      },
    });

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        ...data,
        roles: {
          set: roles.map((r) => ({ id: r.id })),
        },
      },
      create: {
        id: user.id,
        ...data,
        roles: {
          connect: roles.map((r) => ({ id: r.id })),
        },
      },
    });
  }

  public async findRoleByName(name: string): Promise<Role | null> {
    const raw = await prisma.role.findUnique({
      where: { name },
      include: {
        permissions: true,
      },
    });

    if (!raw) return null;

    const roleResult = Role.create(
      {
        name: raw.name,
        description: raw.description || undefined,
        permissions: raw.permissions.map((p) => p.name),
      },
      raw.id
    );

    return roleResult.isSuccess ? roleResult.getValue() : null;
  }
}
