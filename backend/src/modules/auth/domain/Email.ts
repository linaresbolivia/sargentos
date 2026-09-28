import { ValueObject } from '@shared/domain/ValueObject';
import { Result } from '@shared/domain/Result';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  private static formatEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static isValidEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  public static create(email: string): Result<Email> {
    if (!email) {
      return Result.fail<Email>('El correo electrónico no puede estar vacío.');
    }

    const formatted = this.formatEmail(email);

    if (!this.isValidEmail(formatted)) {
      return Result.fail<Email>('El formato del correo electrónico es inválido.');
    }

    return Result.ok<Email>(new Email({ value: formatted }));
  }
}
