import { PrismaClient } from '@prisma/client';

export class GetMyProfileUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(userId: string) {
    // Buscar la Persona vinculada a este User
    const person = await this.prisma.person.findUnique({
      where: { userId },
      include: {
        titularMemberships: {
          include: {
            type: true,
            beneficiaries: true,
            horses: true,
            vehicles: true,
          }
        }
      }
    });

    if (!person || person.titularMemberships.length === 0) {
      return null;
    }

    // Tomamos la membresía principal (asumimos la primera por ahora)
    const primaryMembership = person.titularMemberships[0];

    // Calculamos antigüedad en años
    const admissionDate = new Date(primaryMembership.admissionDate);
    const now = new Date();
    let antiquityYears = now.getFullYear() - admissionDate.getFullYear();
    if (now.getMonth() < admissionDate.getMonth() || (now.getMonth() === admissionDate.getMonth() && now.getDate() < admissionDate.getDate())) {
      antiquityYears--;
    }

    return {
      membershipNumber: primaryMembership.membershipNumber,
      status: primaryMembership.status,
      category: primaryMembership.type.name,
      titularName: `${person.firstName} ${person.lastName || person.paternalSurname || ''}`.trim(),
      phone: person.phone || person.mobile || '',
      documentId: person.documentId,
      antiquityYears: Math.max(0, antiquityYears),
      beneficiariesCount: primaryMembership.beneficiaries.length,
      horsesCount: primaryMembership.horses.length,
      vehiclesCount: primaryMembership.vehicles.length,
      reservationsThisMonth: 0, // TODO: Link to reservations table later
      debt: Number(primaryMembership.totalDebt),
      lastEntry: 'Pendiente', // TODO: Link to AccessLog later
      nextQuotaDate: 'Fin de mes' // TODO: Link to Quota system later
    };
  }
}
