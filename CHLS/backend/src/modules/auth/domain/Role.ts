import { Entity } from '@shared/domain/Entity';
import { Result } from '@shared/domain/Result';

interface RoleProps {
  name: string;
  description?: string;
  permissions: string[]; // List of permission names
}

export class Role extends Entity<RoleProps> {
  private constructor(props: RoleProps, id?: string) {
    super(props, id);
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get permissions(): string[] {
    return this.props.permissions;
  }

  public static create(props: RoleProps, id?: string): Result<Role> {
    if (!props.name || props.name.trim() === '') {
      return Result.fail<Role>('El nombre del rol es requerido.');
    }
    return Result.ok<Role>(new Role(props, id));
  }
}
