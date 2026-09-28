import { User } from '../../domain/User';
import { UserDto } from '../dtos/AuthDto';

export class UserMap {
  public static toDTO(user: User): UserDto {
    return {
      id: user.id,
      email: user.email.value,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles: user.roles.map(r => r.name),
      permissions: user.permissions,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}
