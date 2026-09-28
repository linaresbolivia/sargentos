import { ValueObject } from '@shared/domain/ValueObject';
import { Result } from '@shared/domain/Result';

interface UserPasswordProps {
  value: string;
}

export class UserPassword extends ValueObject<UserPasswordProps> {
  private constructor(props: UserPasswordProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(hashedPassword: string): Result<UserPassword> {
    if (!hashedPassword || hashedPassword.length < 10) {
      return Result.fail<UserPassword>('La contraseña encriptada no tiene una longitud válida.');
    }
    return Result.ok<UserPassword>(new UserPassword({ value: hashedPassword }));
  }
}
