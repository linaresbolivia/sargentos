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
  debtMonthsCount?: number;
  debtStatus?: string;
  debtWarning?: boolean;
  debtBreakdown?: any;
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

    const isSocioSearch = personType === 'SOCIO' || !personType;
    const personTypeFilter: any = isSocioSearch
      ? { in: ['SOCIO', 'HONORARIO', 'PRE_ASOCIADO', 'DEPORTIVO', 'JUNIOR_MAYOR'] }
      : personType;

    try {
      // 1. First search for exact membership number matches
      const exactMembershipPersons = await this.prisma.person.findMany({
        where: {
          personType: personTypeFilter,
          titularMemberships: {
            some: {
              membershipNumber: { equals: searchTerm, mode: 'insensitive' }
            }
          }
        },
        include: {
          titularMemberships: {
            include: { type: true, vehicles: true }
          },
          accessLogs: { orderBy: { timestamp: 'desc' }, take: 1 },
          areaAccessLogs: { where: { status: 'DENTRO' }, orderBy: { entryTime: 'desc' } }
        }
      });

      // 2. Also search for exact document ID (CI) matches
      const exactDocPersons = await this.prisma.person.findMany({
        where: {
          personType: personTypeFilter,
          documentId: { equals: searchTerm, mode: 'insensitive' }
        },
        include: {
          titularMemberships: {
            include: { type: true, vehicles: true }
          },
          accessLogs: { orderBy: { timestamp: 'desc' }, take: 1 },
          areaAccessLogs: { where: { status: 'DENTRO' }, orderBy: { entryTime: 'desc' } }
        }
      });

      // 3. Search for candidates with partial matching
      const partialPersons = await this.prisma.person.findMany({
        where: {
          personType: personTypeFilter,
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
          ]
        },
        include: {
          titularMemberships: {
            include: { type: true, vehicles: true }
          },
          accessLogs: { orderBy: { timestamp: 'desc' }, take: 1 },
          areaAccessLogs: { where: { status: 'DENTRO' }, orderBy: { entryTime: 'desc' } }
        },
        take: 25
      });

      // Merge and deduplicate candidates
      const personMap = new Map<string, any>();
      for (const p of exactMembershipPersons) personMap.set(p.id, p);
      for (const p of exactDocPersons) personMap.set(p.id, p);
      for (const p of partialPersons) {
        if (!personMap.has(p.id)) personMap.set(p.id, p);
      }

      const allCandidates = Array.from(personMap.values());

      // Smart Ranking: prioritize exact membership number, then exact CI, then startsWith, etc.
      const scoreCandidate = (p: any): number => {
        const memNum = (p.titularMemberships[0]?.membershipNumber || '').toLowerCase().trim();
        const docId = (p.documentId || '').toLowerCase().trim();
        const fName = (p.firstName || '').toLowerCase().trim();
        const lName = (p.lastName || '').toLowerCase().trim();
        const full = `${fName} ${lName}`;

        if (memNum === searchTerm) return 10000;
        if (docId === searchTerm) return 9000;
        if (memNum.startsWith(searchTerm)) return 5000 - memNum.length; // closer length gets higher score
        if (docId.startsWith(searchTerm)) return 3000;
        if (fName.startsWith(searchTerm) || lName.startsWith(searchTerm) || full.startsWith(searchTerm)) return 2000;
        if (memNum.includes(searchTerm)) return 1000;
        if (full.includes(searchTerm)) return 500;
        if (docId.includes(searchTerm)) return 200;
        return 100;
      };

      allCandidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
      const persons = allCandidates.slice(0, 6);

      const results: AccessSearchResult[] = persons.map(person => {
        // Find the primary membership (assuming the first one for now)
        const primaryMembership = person.titularMemberships[0];
        
        let status: 'GRANTED' | 'DENIED' = 'GRANTED';
        let reason: string | null = null;
        let totalDebt = 0;
        let debtMonthsCount = 0;
        let debtStatus = 'SIN_DEUDA';
        let debtWarning = false;
        let debtBreakdown: any = null;

        const isClubMember = Boolean(primaryMembership) || ['SOCIO', 'HONORARIO', 'PRE_ASOCIADO', 'DEPORTIVO', 'JUNIOR_MAYOR'].includes(person.personType);

        if (!isClubMember) {
          // Reciprocity and External users do not have memberships, but they are GRANTED by default
          // unless they are explicitly not ACTIVO.
          if (person.status !== 'ACTIVO') {
            status = 'DENIED';
            reason = `Persona en estado: ${person.status}`;
          }
        } else {
          // It's a club member (SOCIO, HONORARIO, etc.), so they need an active membership
          if (!primaryMembership) {
            status = 'DENIED';
            reason = 'No posee membresía activa';
          } else {
            totalDebt = Number(primaryMembership.totalDebt || 0);
            debtMonthsCount = Number((primaryMembership as any).debtMonthsCount || 0);
            debtStatus = (primaryMembership as any).debtStatus || (totalDebt > 0 ? 'CON_DEUDA' : 'SIN_DEUDA');
            
            try {
              if ((primaryMembership as any).debtBreakdown) {
                debtBreakdown = JSON.parse((primaryMembership as any).debtBreakdown);
              }
            } catch (e) {}

            if (person.status !== 'ACTIVO') {
              status = 'DENIED';
              reason = `Persona en estado: ${person.status}`;
            } else if (primaryMembership.status !== 'ACTIVA') {
              status = 'DENIED';
              reason = `Membresía en estado: ${primaryMembership.status}`;
            } else if (totalDebt > 0) {
              // REGLA OPCIÓN 2 (Margen de tolerancia):
              // 1 Mes de deuda: Acceso Permitido con Advertencia Amarilla
              // 2 o más Meses de deuda: Acceso Denegado (Bloqueo Rojo)
              const isSingleMonth = debtStatus === '1_MES' || debtMonthsCount === 1 || (totalDebt > 0 && totalDebt <= 880);

              if (isSingleMonth) {
                status = 'GRANTED';
                debtWarning = true;
                reason = `⚠️ ADVERTENCIA: 1 mes de aporte pendiente (Bs. ${totalDebt.toFixed(2)}). Recuerde regularizar en Caja.`;
              } else {
                status = 'DENIED';
                debtWarning = false;
                const monthsText = debtMonthsCount >= 2 ? `${debtMonthsCount} meses` : 'Mora acumulada';
                reason = `⛔ ACCESO DENEGADO: ${monthsText} de mora pendiente (Bs. ${totalDebt.toFixed(2)}). Dirigirse a Recaudaciones/Caja.`;
              }
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
          .filter((l: any) => l.status === 'DENTRO' && (Boolean(l.lockerKey) || Boolean(l.towelNumber) || (l.towelQty && l.towelQty > 0)))
          .map((l: any) => ({
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
          fullName: `${person.firstName} ${person.lastName || (person as any).paternalSurname || ''}`.trim(),
          documentId: person.documentId || '',
          photoUrl: person.photoUrl,
          membershipNumber: primaryMembership?.membershipNumber || 'N/A',
          membershipType: primaryMembership?.type?.name || 'N/A',
          status,
          reason,
          totalDebt,
          debtMonthsCount,
          debtStatus,
          debtWarning,
          debtBreakdown,
          lastPaymentDate,
          vehicles: primaryMembership?.vehicles.map((v: any) => ({
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
