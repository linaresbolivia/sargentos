import { PrismaClient } from '@prisma/client';

export interface AccessSearchResult {
  personId: string;
  fullName: string;
  documentId: string;
  photoUrl: string | null;
  membershipNumber: string;
  membershipType: string;
  status: 'GRANTED' | 'DENIED';
  reason: string | null;
  totalDebt: number;
  lastPaymentDate: Date | null;
  vehicles: Array<{
    plate: string;
    brand: string | null;
    model: string | null;
  }>;
  currentLocation: 'INSIDE' | 'OUTSIDE';
  lastVehiclePlate?: string | null;
  personType: string;
}

export class SearchMemberForAccessUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(query: string, personType: string = 'SOCIO'): Promise<AccessSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();

    // Find persons by name, document ID, or membership number
    const persons = await this.prisma.person.findMany({
      where: {
        OR: [
          { documentId: { contains: searchTerm, mode: 'insensitive' } },
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          {
            titularMemberships: {
              some: {
                membershipNumber: { contains: searchTerm, mode: 'insensitive' }
              }
            }
          },
          {
            titularMemberships: {
              some: {
                vehicles: {
                  some: {
                    plate: { contains: searchTerm, mode: 'insensitive' }
                  }
                }
              }
            }
          },
          {
            accessLogs: {
              some: {
                vehiclePlate: { contains: searchTerm, mode: 'insensitive' },
                actionType: 'ENTRY',
                status: 'GRANTED'
              }
            }
          }
        ],
        personType: personType // Filter by requested personType
      },
      include: {
        titularMemberships: {
          include: {
            type: true,
            vehicles: true
          }
        },
        accessLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      take: 5
    });

    return persons.map(person => {
      // Find the primary membership (assuming the first one for now)
      const primaryMembership = person.titularMemberships[0];
      
      let status: 'GRANTED' | 'DENIED' = 'GRANTED';
      let reason: string | null = null;
      let totalDebt = 0;

      if (person.personType !== 'SOCIO') {
        // Reciprocity and External users do not have memberships, but they are GRANTED by default
        // unless they are explicitly not ACTIVO.
        if (person.status !== 'ACTIVO') {
          status = 'DENIED';
          reason = `Persona en estado: ${person.status}`;
        }
      } else {
        // It's a SOCIO, so they need an active membership
        if (!primaryMembership) {
          status = 'DENIED';
          reason = 'No posee membresía activa';
        } else {
          totalDebt = Number(primaryMembership.totalDebt || 0);
          
          if (person.status !== 'ACTIVO') {
            status = 'DENIED';
            reason = `Persona en estado: ${person.status}`;
          } else if (primaryMembership.status !== 'ACTIVA') {
            status = 'DENIED';
            reason = `Membresía en estado: ${primaryMembership.status}`;
          } else if (totalDebt > 0) {
            status = 'DENIED';
            reason = 'Deuda Pendiente';
          }
        }
      }

      // Mock last payment date for now until Finance module is built
      const lastPaymentDate = new Date();
      lastPaymentDate.setDate(lastPaymentDate.getDate() - Math.floor(Math.random() * 30));

      const lastLog = person.accessLogs[0];
      const currentLocation = lastLog && lastLog.status === 'GRANTED' && lastLog.actionType === 'ENTRY' 
        ? 'INSIDE' 
        : 'OUTSIDE';

      return {
        personId: person.id,
        fullName: `${person.firstName} ${person.lastName}`,
        documentId: person.documentId || '',
        photoUrl: person.photoUrl,
        membershipNumber: primaryMembership?.membershipNumber || 'N/A',
        membershipType: primaryMembership?.type?.name || 'N/A',
        status,
        reason,
        totalDebt,
        lastPaymentDate,
        vehicles: primaryMembership?.vehicles.map(v => ({
          plate: v.plate,
          brand: v.brand,
          model: v.model
        })) || [],
        currentLocation,
        lastVehiclePlate: lastLog?.vehiclePlate,
        personType: person.personType || 'SOCIO'
      };
    });
  }
}
