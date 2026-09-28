import { Entity } from '@shared/domain/Entity';
import { Result } from '@shared/domain/Result';

interface MemberProfileProps {
  userId: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  category: string;
  photoUrl?: string | null;
  totalDebt: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MemberProfile extends Entity<MemberProfileProps> {
  private constructor(props: MemberProfileProps, id?: string) {
    super(props, id);
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get membershipNumber(): string {
    return this.props.membershipNumber;
  }

  public get firstName(): string {
    return this.props.firstName;
  }

  public get lastName(): string {
    return this.props.lastName;
  }

  public get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  public get category(): string {
    return this.props.category;
  }

  public get photoUrl(): string | null | undefined {
    return this.props.photoUrl;
  }

  public get totalDebt(): number {
    return this.props.totalDebt;
  }

  public get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  public hasDebt(): boolean {
    return this.props.totalDebt > 0;
  }

  public updateDebt(amount: number): void {
    this.props.totalDebt = amount;
    this.props.updatedAt = new Date();
  }

  public static create(props: MemberProfileProps, id?: string): Result<MemberProfile> {
    if (!props.userId) {
      return Result.fail<MemberProfile>('El userId es requerido para el perfil del socio.');
    }
    if (!props.membershipNumber) {
      return Result.fail<MemberProfile>('El número de membresía es requerido.');
    }
    if (!props.firstName || !props.lastName) {
      return Result.fail<MemberProfile>('El nombre y apellido son requeridos.');
    }
    if (!props.category) {
      return Result.fail<MemberProfile>('La categoría del socio es requerida.');
    }

    const defaultProps = {
      ...props,
      totalDebt: props.totalDebt !== undefined ? props.totalDebt : 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };

    return Result.ok<MemberProfile>(new MemberProfile(defaultProps, id));
  }
}
