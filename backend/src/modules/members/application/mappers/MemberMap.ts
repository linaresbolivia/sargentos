import { MemberProfile } from '../../domain/MemberProfile';
import { MemberProfileDto } from '../dtos/MemberDto';

export class MemberMap {
  public static toDTO(member: MemberProfile): MemberProfileDto {
    return {
      id: member.id,
      userId: member.userId,
      membershipNumber: member.membershipNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: member.fullName,
      category: member.category,
      photoUrl: member.photoUrl || null,
      totalDebt: Number(member.totalDebt),
      hasDebt: member.hasDebt(),
      createdAt: member.createdAt ? member.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}
