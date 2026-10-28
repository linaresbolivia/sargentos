import { IUserRepository } from '../../domain/IUserRepository';
import { IUserTokenRepository } from '../../domain/IUserTokenRepository';
import { UserToken } from '../../domain/UserToken';
import { Email } from '../../domain/Email';
import { IHashService } from '../ports/IHashService';
import { ITokenService } from '../ports/ITokenService';
import { AuthResponseDto } from '../dtos/AuthDto';
import { UserMap } from '../mappers/UserMap';
import { Result } from '@shared/domain/Result';

interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private userTokenRepository: IUserTokenRepository,
    private hashService: IHashService,
    private tokenService: ITokenService
  ) {}

  public async execute(input: LoginInput): Promise<Result<AuthResponseDto>> {
    // 1. Normalize and resolve user by identifier (Código de Socio, Username o Email)
    const rawInput = (input.email || '').trim();
    if (!rawInput) {
      return Result.fail<AuthResponseDto>('Debe ingresar su Código de Socio, usuario o correo electrónico.');
    }

    let user = await this.userRepository.findByIdentifier(rawInput);

    // Fallback: If not found and input lacks '@', try institutional email domain suffixes
    if (!user && !rawInput.includes('@')) {
      const emailSargentos = Email.create(`${rawInput.toLowerCase()}@sargentos.com.bo`);
      if (!emailSargentos.isFailure) {
        user = await this.userRepository.findByEmail(emailSargentos.getValue().value);
      }
      if (!user) {
        const emailChls = Email.create(`${rawInput.toLowerCase()}@chls.bo`);
        if (!emailChls.isFailure) {
          user = await this.userRepository.findByEmail(emailChls.getValue().value);
        }
      }
    }

    if (!user) {
      return Result.fail<AuthResponseDto>('Credenciales inválidas.');
    }

    // 3. Verify password
    const isPasswordValid = await this.hashService.compare(
      input.password,
      user.password.value
    );
    if (!isPasswordValid) {
      return Result.fail<AuthResponseDto>('Credenciales inválidas.');
    }

    // 4. Check if active
    if (!user.isActive) {
      return Result.fail<AuthResponseDto>('Esta cuenta de usuario ha sido desactivada.');
    }

    // 5. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email.value,
      roles: user.roles.map(r => r.name),
      permissions: user.permissions,
    });

    const refreshTokenString = this.tokenService.generateRefreshToken();

    // Refresh token expiry: 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create & save user token entity
    const userTokenResult = UserToken.create({
      userId: user.id,
      token: refreshTokenString,
      expiresAt,
    });

    if (userTokenResult.isFailure) {
      return Result.fail<AuthResponseDto>(userTokenResult.getError());
    }

    await this.userTokenRepository.save(userTokenResult.getValue());

    // 6. Return response
    return Result.ok<AuthResponseDto>({
      user: UserMap.toDTO(user),
      accessToken,
      refreshToken: refreshTokenString,
    });
  }
}
