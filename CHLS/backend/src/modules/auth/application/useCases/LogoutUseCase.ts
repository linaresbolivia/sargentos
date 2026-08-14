import { IUserTokenRepository } from '../../domain/IUserTokenRepository';
import { Result } from '@shared/domain/Result';

interface LogoutInput {
  refreshToken: string;
}

export class LogoutUseCase {
  constructor(private userTokenRepository: IUserTokenRepository) {}

  public async execute(input: LogoutInput): Promise<Result<void>> {
    if (!input.refreshToken) {
      return Result.fail<void>('El refresh token es requerido.');
    }

    const userToken = await this.userTokenRepository.findByToken(input.refreshToken);
    if (!userToken) {
      // Already logged out or invalid, fail silently or succeed for client ease
      return Result.ok<void>();
    }

    userToken.revoke();
    await this.userTokenRepository.save(userToken);

    return Result.ok<void>();
  }
}
