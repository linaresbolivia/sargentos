import { PrismaClient } from '@prisma/client';

export interface AreaLoanItem {
  id: string;
  area: string;
  entryTime: Date;
  lockerKey: string | null;
  towelNumber: string | null;
  towelQty: number;
  towelSize: string | null;
  observations?: string | null;
}

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
  pendingAreaLoans?: AreaLoanItem[];
}

export class SearchMemberForAccessUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(query: string, personType: string = 'SOCIO'): Promise<AccessSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();

    try {
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
        },
        areaAccessLogs: {
          where: { status: 'DENTRO' },
          orderBy: { entryTime: 'desc' }
        }
      },
      take: 5
    });

      const results: AccessSearchResult[] = persons.map(person => {
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

        // Check for unreturned locker keys or towels in Piscina or Gimnasio
        const pendingAreaLoans: AreaLoanItem[] = (person.areaAccessLogs || [])
          .filter(l => l.status === 'DENTRO' && (Boolean(l.lockerKey) || Boolean(l.towelNumber) || (l.towelQty && l.towelQty > 0)))
          .map(l => ({
            id: l.id,
            area: l.area,
            entryTime: l.entryTime,
            lockerKey: l.lockerKey,
            towelNumber: l.towelNumber,
            towelQty: l.towelQty,
            towelSize: l.towelSize,
            observations: l.observations
          }));

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
          personType: person.personType || 'SOCIO',
          pendingAreaLoans
        };
      });

      // Also search VIP Passes
      const vipPasses = await this.prisma.vipPass.findMany({
        where: {
          OR: [
            { code: { contains: searchTerm, mode: 'insensitive' } },
            { guestFullName: { contains: searchTerm, mode: 'insensitive' } },
            { documentId: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: 3
      });

      const now = new Date();
      for (const vp of vipPasses) {
        const until = new Date(vp.validUntil);
        until.setHours(23, 59, 59, 999);
        const from = new Date(vp.validFrom);
        from.setHours(0, 0, 0, 0);

        let passStatus: 'GRANTED' | 'DENIED' = 'GRANTED';
        let passReason: string | null = `Pase VIP Válido (Anfitrión: ${vp.hostSellerName}) - Áreas: ${vp.allowedAreas}`;

        if (vp.status === 'REVOCADO') {
          passStatus = 'DENIED';
          passReason = 'Pase VIP REVOCADO por Administración';
        } else if (now < from) {
          passStatus = 'DENIED';
          passReason = `Pase aún no vigente (Válido desde ${from.toLocaleDateString()})`;
        } else if (now > until) {
          passStatus = 'DENIED';
          passReason = `Pase VIP EXPIRADO el ${until.toLocaleDateString()}`;
        } else if (vp.usageCount >= vp.maxUses) {
          passStatus = 'DENIED';
          passReason = `Límite de usos alcanzado (${vp.usageCount}/${vp.maxUses})`;
        }

        // Check if this VIP pass has an active ENTRY at Gatehouse
        const lastVipLog = await this.prisma.accessLog.findFirst({
          where: {
            OR: [
              { observation: { contains: vp.code, mode: 'insensitive' } },
              { reason: { contains: vp.code, mode: 'insensitive' } },
              { observation: { contains: vp.guestFullName, mode: 'insensitive' } },
              { reason: { contains: vp.guestFullName, mode: 'insensitive' } },
              { observation: { contains: vp.id, mode: 'insensitive' } },
              { personId: `vip_${vp.id}` }
            ]
          },
          orderBy: { timestamp: 'desc' }
        });

        // Extract short numeric code (e.g., '3703' from 'VIP-CHLS-3703')
        const passCodeShort = vp.code.replace('VIP-CHLS-', '').replace('VIP-', '');

        // Check last area log in Piscina or Gimnasio
        const lastAreaLog = await this.prisma.areaAccessLog.findFirst({
          where: {
            OR: [
              { observations: { contains: vp.code, mode: 'insensitive' } },
              { observations: { contains: vp.guestFullName, mode: 'insensitive' } },
              { observations: { contains: passCodeShort, mode: 'insensitive' } },
              { memberCode: vp.code },
              { memberCode: { contains: passCodeShort, mode: 'insensitive' } },
              { personName: { contains: vp.guestFullName, mode: 'insensitive' } }
            ]
          },
          orderBy: { entryTime: 'desc' }
        });

        // Check for unreturned locker keys or towels in Piscina or Gimnasio for this VIP pass guest
        const pendingLoans = await this.prisma.areaAccessLog.findMany({
          where: {
            status: 'DENTRO',
            OR: [
              { observations: { contains: vp.code, mode: 'insensitive' } },
              { observations: { contains: vp.guestFullName, mode: 'insensitive' } },
              { observations: { contains: passCodeShort, mode: 'insensitive' } },
              { memberCode: vp.code },
              { memberCode: { contains: passCodeShort, mode: 'insensitive' } },
              { personName: { contains: vp.guestFullName, mode: 'insensitive' } }
            ]
          }
        });

        const pendingAreaLoans: AreaLoanItem[] = pendingLoans
          .filter(l => Boolean(l.lockerKey) || Boolean(l.towelNumber) || (l.towelQty && l.towelQty > 0))
          .map(l => ({
            id: l.id,
            area: l.area,
            entryTime: l.entryTime,
            lockerKey: l.lockerKey,
            towelNumber: l.towelNumber,
            towelQty: l.towelQty,
            towelSize: l.towelSize,
            observations: l.observations
          }));

        const isInside = (lastVipLog && lastVipLog.actionType === 'ENTRY') || (lastAreaLog && lastAreaLog.status === 'DENTRO') || pendingAreaLoans.length > 0;
        const currentLocation = isInside ? 'INSIDE' : 'OUTSIDE';

        // If the guest is inside the club, status for EXIT is GRANTED
        let finalPassStatus = passStatus;
        let finalPassReason = passReason;
        if (isInside) {
          finalPassStatus = 'GRANTED';
          finalPassReason = passStatus === 'GRANTED' ? passReason : `${passReason} (Registrando Salida del Club)`;
        }

        results.unshift({
          personId: `vip_${vp.id}`,
          fullName: `⭐ INVITADO VIP: ${vp.guestFullName}`,
          documentId: vp.documentId || vp.code,
          photoUrl: null,
          membershipNumber: vp.code,
          membershipType: `PASE DE CORTESÍA VIP (Áreas: ${vp.allowedAreas})`,
          status: finalPassStatus,
          reason: finalPassReason,
          totalDebt: 0,
          lastPaymentDate: null,
          vehicles: [],
          currentLocation,
          lastVehiclePlate: lastVipLog?.vehiclePlate,
          personType: 'INVITADO_VIP',
          pendingAreaLoans
        });
      }

      return results;
    } catch (err) {
      console.error('Error in SearchMemberForAccessUseCase:', err);
      return [];
    }
  }
}
