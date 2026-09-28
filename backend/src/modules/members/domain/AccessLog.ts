import { Entity } from '@shared/domain/Entity';
import { Result } from '@shared/domain/Result';

interface AccessLogProps {
  memberProfileId: string;
  timestamp?: Date;
  status: 'GRANTED' | 'DENIED';
  reason?: string | null;
}

export class AccessLog extends Entity<AccessLogProps> {
  private constructor(props: AccessLogProps, id?: string) {
    super(props, id);
  }

  public get memberProfileId(): string {
    return this.props.memberProfileId;
  }

  public get timestamp(): Date {
    return this.props.timestamp || new Date();
  }

  public get status(): 'GRANTED' | 'DENIED' {
    return this.props.status;
  }

  public get reason(): string | null | undefined {
    return this.props.reason;
  }

  public static create(props: AccessLogProps, id?: string): Result<AccessLog> {
    if (!props.memberProfileId) {
      return Result.fail<AccessLog>('El id del perfil del socio es requerido.');
    }
    if (!props.status || (props.status !== 'GRANTED' && props.status !== 'DENIED')) {
      return Result.fail<AccessLog>('El estado del acceso es inválido (GRANTED o DENIED).');
    }

    const defaultProps = {
      ...props,
      timestamp: props.timestamp || new Date(),
      reason: props.reason || null,
    };

    return Result.ok<AccessLog>(new AccessLog(defaultProps, id));
  }
}
