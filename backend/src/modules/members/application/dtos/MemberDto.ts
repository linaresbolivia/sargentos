export interface MemberProfileDto {
  id: string;
  userId: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  category: string;
  photoUrl: string | null;
  totalDebt: number;
  hasDebt: boolean;
  createdAt: string;
}

export interface AccessLogDto {
  id: string;
  memberProfileId: string;
  memberName: string;
  membershipNumber: string;
  timestamp: string;
  status: 'GRANTED' | 'DENIED';
  reason: string | null;
}

export interface AccessCheckResponseDto {
  allowed: boolean;
  member: MemberProfileDto;
  log: AccessLogDto;
}
