import { PrismaClient } from '@prisma/client';

export class GetMemberProfileByUserIdUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(userId: string) {
    const person = await this.prisma.person.findUnique({
      where: { userId },
      include: {
        titularMemberships: {
          include: {
            type: true,
          }
        }
      }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    if (!person) {
      // Si no tiene registro en Person aún, devolver lo básico de User para que pueda crearlo
      return {
        personId: '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        documentId: user.documentId || '',
        email: user.email || '',
        phone: user.phone || '',
        mobile: '',
        birthDate: '',
        gender: 'M',
        maritalStatus: 'S',
        nationality: 'Boliviana',
        profession: '',
        company: '',
        address: '',
        personType: 'SOCIO',
        membershipId: null,
        membershipNumber: '',
        admissionDate: '',
        typeCode: 'TIT',
        status: 'ACTIVA',
      };
    }

    const primaryMembership = person.titularMemberships[0];

    return {
      // Person Data
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      documentId: person.documentId,
      email: person.email,
      phone: person.phone || '',
      mobile: person.mobile || '',
      birthDate: person.birthDate ? person.birthDate.toISOString().split('T')[0] : '',
      gender: person.gender || '',
      maritalStatus: person.maritalStatus || '',
      nationality: person.nationality || '',
      profession: person.profession || '',
      company: person.company || '',
      address: person.address || '',
      personType: person.personType || 'SOCIO',
      
      // Membership Data
      membershipId: primaryMembership?.id || null,
      membershipNumber: primaryMembership?.membershipNumber || '',
      admissionDate: primaryMembership?.admissionDate ? primaryMembership.admissionDate.toISOString().split('T')[0] : '',
      typeCode: primaryMembership?.type?.code || '',
      status: primaryMembership?.status || '',
    };
  }
}
