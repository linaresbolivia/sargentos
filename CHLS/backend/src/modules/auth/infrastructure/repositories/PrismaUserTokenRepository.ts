import { IUserTokenRepository } from '../../domain/IUserTokenRepository';
import { UserToken } from '../../domain/UserToken';
import { prisma } from '@shared/infrastructure/prisma';

export class PrismaUserTokenRepository implements IUserTokenRepository {
  private toDomain(raw: any): UserToken {
    const userTokenResult = UserToken.create(
      {
        userId: raw.userId,
        token: raw.token,
        expiresAt: raw.expiresAt,
        revokedAt: raw.revokedAt,
        createdAt: raw.createdAt,
      },
      raw.id
    );

    if (userTokenResult.isFailure) {
      throw new Error(`Error de mapeo de base de datos a dominio para token ${raw.id}`);
    }

    return userTokenResult.getValue();
  }

  public async findByToken(token: string): Promise<UserToken | null> {
    const raw = await prisma.userToken.findUnique({
      where: { token },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  public async save(userToken: UserToken): Promise<void> {
    const data = {
      userId: userToken.userId,
      token: userToken.token,
      expiresAt: userToken.expiresAt,
      revokedAt: userToken.revokedAt,
    };

    await prisma.userToken.upsert({
      where: { id: userToken.id },
      update: {
        revokedAt: userToken.revokedAt,
      },
      create: {
        id: userToken.id,
        ...data,
      },
    });
  }

  public async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.userToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
