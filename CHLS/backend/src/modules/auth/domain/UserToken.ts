import { Entity } from '@shared/domain/Entity';
import { Result } from '@shared/domain/Result';

interface UserTokenProps {
  userId: string;
  token: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
}

export class UserToken extends Entity<UserTokenProps> {
  private constructor(props: UserTokenProps, id?: string) {
    super(props, id);
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get token(): string {
    return this.props.token;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get revokedAt(): Date | null | undefined {
    return this.props.revokedAt;
  }

  public get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  public isRevoked(): boolean {
    return !!this.props.revokedAt;
  }

  public revoke(): void {
    this.props.revokedAt = new Date();
  }

  public isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  public static create(props: UserTokenProps, id?: string): Result<UserToken> {
    if (!props.userId) {
      return Result.fail<UserToken>('El id del usuario es requerido para el token.');
    }
    if (!props.token) {
      return Result.fail<UserToken>('El token no puede estar vacío.');
    }
    const defaultProps = {
      ...props,
      revokedAt: props.revokedAt || null,
      createdAt: props.createdAt || new Date(),
    };
    return Result.ok<UserToken>(new UserToken(defaultProps, id));
  }
}
