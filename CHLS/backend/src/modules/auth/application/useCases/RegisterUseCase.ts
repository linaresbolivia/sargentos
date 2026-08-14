import { IUserRepository } from '../../domain/IUserRepository';
import { IUserTokenRepository } from '../../domain/IUserTokenRepository';
import { User } from '../../domain/User';
import { Email } from '../../domain/Email';
import { UserPassword } from '../../domain/UserPassword';
import { UserToken } from '../../domain/UserToken';
import { Role } from '../../domain/Role';
import { IHashService } from '../ports/IHashService';
import { ITokenService } from '../ports/ITokenService';
import { AuthResponseDto } from '../dtos/AuthDto';
import { UserMap } from '../mappers/UserMap';
import { Result } from '@shared/domain/Result';

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export class RegisterUseCase {
  constructor(
    private userRepository: IUserRepository,
    private userTokenRepository: IUserTokenRepository,
    private hashService: IHashService,
    private tokenService: ITokenService
  ) {}

  public async execute(input: RegisterInput): Promise<Result<AuthResponseDto>> {
    // 1. Validate inputs
    const emailResult = Email.create(input.email);
    if (emailResult.isFailure) {
      return Result.fail<AuthResponseDto>(emailResult.getError());
    }

    if (!input.password || input.password.length < 6) {
      return Result.fail<AuthResponseDto>('La contraseña debe tener al menos 6 caracteres.');
    }

    const email = emailResult.getValue();

    // 2. Check if user already exists
    const userAlreadyExists = await this.userRepository.exists(email.value);
    if (userAlreadyExists) {
      return Result.fail<AuthResponseDto>('Este correo electrónico ya está registrado.');
    }

    // 3. Hash password
    const passwordHash = await this.hashService.hash(input.password);
    const passwordResult = UserPassword.create(passwordHash);
    if (passwordResult.isFailure) {
      return Result.fail<AuthResponseDto>(passwordResult.getError());
    }

    const password = passwordResult.getValue();

    // 4. Assign default USER role
    let userRole = await this.userRepository.findRoleByName('USER');
    if (!userRole) {
      // Create role aggregate if not exists (seed safety)
      const roleResult = Role.create({
        name: 'USER',
        description: 'Rol de usuario básico',
        permissions: ['read:profile'],
      });
      if (roleResult.isFailure) {
        return Result.fail<AuthResponseDto>(roleResult.getError());
      }
      userRole = roleResult.getValue();
    }

    // 5. Create user aggregate
    const userResult = User.create({
      email,
      password,
      firstName: input.firstName || 'Usuario',
      lastName: input.lastName || 'Desconocido',
      isActive: true,
      roles: [userRole],
    });

    if (userResult.isFailure) {
      return Result.fail<AuthResponseDto>(userResult.getError());
    }

    const user = userResult.getValue();

    // 6. Save user to repository
    await this.userRepository.save(user);

    // 7. Generate tokens
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

    // 8. Return response DTO
    return Result.ok<AuthResponseDto>({
      user: UserMap.toDTO(user),
      accessToken,
      refreshToken: refreshTokenString,
    });
  }
}
