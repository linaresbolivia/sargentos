import { RegisterUseCase } from './RegisterUseCase';
import { IUserRepository } from '../../domain/IUserRepository';
import { IUserTokenRepository } from '../../domain/IUserTokenRepository';
import { IHashService } from '../ports/IHashService';
import { ITokenService } from '../ports/ITokenService';
import { Role } from '../../domain/Role';

describe('RegisterUseCase', () => {
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockUserTokenRepository: jest.Mocked<IUserTokenRepository>;
  let mockHashService: jest.Mocked<IHashService>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    mockUserRepository = {
      exists: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findRoleByName: jest.fn(),
    } as any;

    mockUserTokenRepository = {
      findByToken: jest.fn(),
      save: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    } as any;

    mockHashService = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      compare: jest.fn(),
    };

    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access_token'),
      verifyAccessToken: jest.fn(),
      generateRefreshToken: jest.fn().mockReturnValue('refresh_token'),
    };

    useCase = new RegisterUseCase(
      mockUserRepository,
      mockUserTokenRepository,
      mockHashService,
      mockTokenService
    );
  });

  it('should successfully register a new user and generate tokens', async () => {
    // Arrange
    mockUserRepository.exists.mockResolvedValue(false);
    
    const role = Role.create({
      name: 'USER',
      description: 'Default role',
      permissions: ['read:profile'],
    }).getValue();
    
    mockUserRepository.findRoleByName.mockResolvedValue(role);

    const input = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result.isSuccess).toBe(true);
    const data = result.getValue();
    expect(data.accessToken).toBe('access_token');
    expect(data.refreshToken).toBe('refresh_token');
    expect(data.user.email).toBe('test@example.com');
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockUserTokenRepository.save).toHaveBeenCalled();
  });

  it('should fail if email format is invalid', async () => {
    // Arrange
    const input = {
      email: 'invalid-email',
      password: 'password123',
    };

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('formato del correo electrónico es inválido');
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('should fail if user already exists', async () => {
    // Arrange
    mockUserRepository.exists.mockResolvedValue(true);

    const input = {
      email: 'existing@example.com',
      password: 'password123',
    };

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('ya está registrado');
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });
});
