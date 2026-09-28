import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

export interface MassiveMemberDTO {
  // User Account
  email: string;
  password?: string;
  
  // Person Data
  firstName: string;
  lastName: string;
  documentId: string;
  phone?: string;
  mobile?: string;
  birthDate?: Date;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  profession?: string;
  company?: string;
  address?: string;
  city?: string;
  
  // Membership Data
  membershipNumber: string;
  typeCode: string; // e.g. "TIT"
  status?: string;
  purchaseValue?: number;
  currentValue?: number;
  acquisitionMethod?: string;
  isTransferable?: boolean;
  hasShares?: boolean;
  sharesQuantity?: number;
  physicalDossierLoc?: string;
  observations?: string;
}

export class CreateMemberMassiveUseCase {
  constructor(private prisma: PrismaClient) {}

  public async execute(data: MassiveMemberDTO): Promise<any> {
    const passwordHash = await argon2.hash(data.password || 'CHLS2024!');

    return await this.prisma.$transaction(async (tx) => {
      // 1. Ensure MembershipType exists
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

      // 2. Ensure Role exists
      let userRole = await tx.role.findUnique({ where: { name: 'USER' } });
      if (!userRole) {
        userRole = await tx.role.create({ data: { name: 'USER', description: 'Rol Base' }});
      }

      // 3. Create User
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          documentId: data.documentId,
          phone: data.mobile || data.phone,
          isActive: true,
          roles: {
            connect: [{ id: userRole.id }]
          }
        }
      });

      // 4. Create Person
      const person = await tx.person.create({
        data: {
          userId: user.id,
          documentId: data.documentId,
          firstName: data.firstName,
          lastName: data.lastName,
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
          city: data.city,
          status: 'ACTIVO'
        }
      });

      // 5. Create Membership
      const membership = await tx.membership.create({
        data: {
          membershipNumber: data.membershipNumber,
          typeId: memType.id,
          titularId: person.id,
          status: data.status || 'ACTIVA',
          purchaseValue: data.purchaseValue || 0,
          currentValue: data.currentValue || 0,
          acquisitionMethod: data.acquisitionMethod,
          isTransferable: data.isTransferable !== false, // default true
          hasShares: data.hasShares || false,
          sharesQuantity: data.sharesQuantity || 0,
          physicalDossierLoc: data.physicalDossierLoc,
          observations: data.observations,
          admissionDate: new Date(),
          activationDate: new Date(),
        }
      });

      return {
        user,
        person,
        membership
      };
    });
  }
}
