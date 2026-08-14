import { IMemberRepository } from '../../domain/IMemberRepository';
import { MemberProfile } from '../../domain/MemberProfile';
import { prisma } from '@shared/infrastructure/prisma';


export class PrismaMemberRepository implements IMemberRepository {
  private toDomain(raw: any): MemberProfile {
    const membership = raw.titularMemberships?.[0]; // Assuming one titular membership for simplicity, or we take the first
    
    const memberResult = MemberProfile.create(
      {
        userId: raw.userId || '',
        membershipNumber: membership?.membershipNumber || 'N/A',
        firstName: raw.firstName,
        lastName: raw.lastName,
        category: membership?.type?.name || 'Socio',
        photoUrl: raw.photoUrl,
        totalDebt: membership ? Number(membership.totalDebt) : 0,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id
    );

    if (memberResult.isFailure) {
      throw new Error(`Error de mapeo de base de datos a dominio para perfil de socio ${raw.id}`);
    }

    return memberResult.getValue();
  }

  public async findById(id: string): Promise<MemberProfile | null> {
    const raw = await prisma.person.findUnique({
      where: { id },
      include: {
        titularMemberships: {
          include: { type: true }
        }
      }
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  public async findByUserId(userId: string): Promise<MemberProfile | null> {
    const raw = await prisma.person.findUnique({
      where: { userId },
      include: {
        titularMemberships: {
          include: { type: true }
        }
      }
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  public async findByMembershipNumber(membershipNumber: string): Promise<MemberProfile | null> {
    const membership = await prisma.membership.findUnique({
      where: { membershipNumber },
      include: {
        titular: {
          include: {
            titularMemberships: {
              include: { type: true }
            }
          }
        }
      }
    });
    if (!membership || !membership.titular) return null;
    return this.toDomain(membership.titular);
  }

  public async searchMembers(query: string): Promise<MemberProfile[]> {
    const rawMembers = await prisma.person.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          {
            titularMemberships: {
              some: {
                membershipNumber: { contains: query, mode: 'insensitive' }
              }
            }
          }
        ],
      },
      include: {
        titularMemberships: {
          include: { type: true }
        }
      }
    });
    return rawMembers.map((m) => this.toDomain(m));
  }

  public async save(memberProfile: MemberProfile): Promise<void> {
    // In this simplified adapter, we only update the Person and Membership if they exist.
    // Creating them correctly would require handling documentId, membership types, etc.
    // For now, we update the Person photo and names, and totalDebt.
    
    await prisma.person.update({
      where: { id: memberProfile.id },
      data: {
        firstName: memberProfile.firstName,
        lastName: memberProfile.lastName,
        photoUrl: memberProfile.photoUrl,
        updatedAt: new Date(),
      }
    });
    
    if (memberProfile.membershipNumber !== 'N/A') {
      await prisma.membership.update({
        where: { membershipNumber: memberProfile.membershipNumber },
        data: {
          totalDebt: memberProfile.totalDebt,
          updatedAt: new Date(),
        }
      });
    }
  }
}
