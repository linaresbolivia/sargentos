import { MemberProfile } from './MemberProfile';

export interface IMemberRepository {
  findById(id: string): Promise<MemberProfile | null>;
  findByUserId(userId: string): Promise<MemberProfile | null>;
  findByMembershipNumber(membershipNumber: string): Promise<MemberProfile | null>;
  searchMembers(query: string): Promise<MemberProfile[]>;
  save(memberProfile: MemberProfile): Promise<void>;
}
