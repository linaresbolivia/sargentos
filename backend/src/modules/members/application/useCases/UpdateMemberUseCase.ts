import { PrismaClient } from '@prisma/client';

export interface UpdateMemberDTO {
  // Personal Data
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone?: string;
  mobile?: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  profession?: string;
  company?: string;
  address?: string;
  personType?: string;

  // Membership Data
  membershipId?: string;
  membershipNumber?: string;
  admissionDate?: string;
  typeCode?: string;
  status?: string;
}

export class UpdateMemberUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(userId: string, data: UpdateMemberDTO) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Update User (only base fields)
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          documentId: data.documentId,
          email: data.email,
          phone: data.mobile || data.phone,
        }
      });

      // 2. Upsert Person
      const personData = {
        firstName: data.firstName,
        lastName: data.lastName,
        documentId: data.documentId,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        nationality: data.nationality,
        profession: data.profession,
        company: data.company,
        address: data.address,
        personType: data.personType || 'SOCIO',
      };

      const person = await tx.person.upsert({
        where: { userId },
        update: personData,
        create: {
          ...personData,
          userId,
        }
      });

      // 3. Upsert Membership
      if (data.membershipNumber && data.typeCode) {
        // Ensure MembershipType exists if changed
        let memType = await tx.membershipType.findUnique({
          where: { code: data.typeCode }
        });
        if (!memType) {
          memType = await tx.membershipType.create({
            data: {
              code: data.typeCode,
              name: `Tipo ${data.typeCode}`,
              monthlyFee: 0,
              maxBeneficiaries: 5,
              votingRights: true
            }
          });
        }

        if (data.membershipId) {
          await tx.membership.update({
            where: { id: data.membershipId },
            data: {
              membershipNumber: data.membershipNumber,
              admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
              typeId: memType.id,
              status: data.status,
            }
          });
        } else {
          // Si no había membresía previa, la creamos
          await tx.membership.create({
            data: {
              titularId: person.id,
              membershipNumber: data.membershipNumber,
              typeId: memType.id,
              status: data.status || 'ACTIVA',
              purchaseValue: 0,
              currentValue: 0,
              acquisitionMethod: 'COMPRA DIRECTA',
              isTransferable: true,
              hasShares: false,
              sharesQuantity: 0,
            }
          });
        }
      }

      return { success: true, user, person };
    });
  }
}
