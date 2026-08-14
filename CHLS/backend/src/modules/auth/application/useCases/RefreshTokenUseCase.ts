import { IUserRepository } from '../../domain/IUserRepository';
import { IUserTokenRepository } from '../../domain/IUserTokenRepository';
import { UserToken } from '../../domain/UserToken';
import { ITokenService } from '../ports/ITokenService';
import { TokenRefreshResponseDto } from '../dtos/AuthDto';
import { Result } from '@shared/domain/Result';

interface RefreshTokenInput {
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private userRepository: IUserRepository,
    private userTokenRepository: IUserTokenRepository,
    private tokenService: ITokenService
  ) {}

  public async execute(input: RefreshTokenInput): Promise<Result<TokenRefreshResponseDto>> {
    if (!input.refreshToken) {
      return Result.fail<TokenRefreshResponseDto>('Refresh token es requerido.');
    }

    // 1. Find token in repository
    const userToken = await this.userTokenRepository.findByToken(input.refreshToken);
    
    if (!userToken) {
      return Result.fail<TokenRefreshResponseDto>('Token de actualización inválido.');
    }

    // 2. Security Check: If token is already revoked, it might be a reuse attack.
    // Invalidate ALL tokens for this user as a precaution.
    if (userToken.isRevoked()) {
      await this.userTokenRepository.revokeAllUserTokens(userToken.userId);
      return Result.fail<TokenRefreshResponseDto>('Se detectó reutilización de token. Todas las sesiones han sido cerradas.');
    }

    // 3. Check if expired
    if (userToken.isExpired()) {
      return Result.fail<TokenRefreshResponseDto>('El token de actualización ha expirado.');
    }

    // 4. Fetch User
    const user = await this.userRepository.findById(userToken.userId);
    if (!user || !user.isActive) {
      return Result.fail<TokenRefreshResponseDto>('Usuario no encontrado o inactivo.');
    }

    // 5. Revoke the used token (Rotation)
    userToken.revoke();
    await this.userTokenRepository.save(userToken);

    // 6. Generate new access and refresh tokens
    const newAccessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      roles: user.roles.map(r => r.name),
      permissions: user.permissions,
    });

    const newRefreshTokenString = this.tokenService.generateRefreshToken();

    // Expire in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create & save new token
    const newRefreshTokenResult = UserToken.create({
      userId: user.id,
      token: newRefreshTokenString,
      expiresAt,
    });

    if (newRefreshTokenResult.isFailure) {
      return Result.fail<TokenRefreshResponseDto>(newRefreshTokenResult.getError());
    }

    await this.userTokenRepository.save(newRefreshTokenResult.getValue());

    // 7. Return new tokens
    return Result.ok<TokenRefreshResponseDto>({
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenString,
    });
  }
}
