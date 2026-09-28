import { Entity } from '@shared/domain/Entity';
import { Result } from '@shared/domain/Result';
import { Email } from './Email';
import { UserPassword } from './UserPassword';
import { Role } from './Role';

interface UserProps {
  email: Email;
  password: UserPassword;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: Role[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  public get email(): Email {
    return this.props.email;
  }

  public get firstName(): string {
    return this.props.firstName;
  }

  public get lastName(): string {
    return this.props.lastName;
  }

  public get password(): UserPassword {
    return this.props.password;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get roles(): Role[] {
    return this.props.roles;
  }

  public get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  public activate(): void {
    this.props.isActive = true;
  }

  public deactivate(): void {
    this.props.isActive = false;
  }

  public updateRoles(roles: Role[]): void {
    this.props.roles = roles;
  }

  // Get all permission names across all user roles
  public get permissions(): string[] {
    const list = new Set<string>();
    for (const role of this.props.roles) {
      for (const permission of role.permissions) {
        list.add(permission);
      }
    }
    return Array.from(list);
  }

  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  public static create(props: UserProps, id?: string): Result<User> {
    const defaultProps: UserProps = {
      ...props,
      firstName: props.firstName || 'Usuario',
      lastName: props.lastName || 'Desconocido',
      isActive: props.isActive !== undefined ? props.isActive : true,
      roles: props.roles || [],
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };

    return Result.ok<User>(new User(defaultProps, id));
  }
}
