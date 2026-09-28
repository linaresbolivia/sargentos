import { PrismaClient } from '@prisma/client';

export class AssemblyProtocolService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get or Create Assembly Session and calculate Census
   */
  public async getOrCreateSession(title: string, sessionDateStr?: string) {
    const sessionDate = sessionDateStr ? new Date(sessionDateStr) : new Date();
    
    // Default cutoff time is 15:00 hrs of the assembly date
    const cutoffTime = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 15, 0, 0);

    let session = await this.prisma.assemblySession.findFirst({
      where: {
        sessionDate: {
          gte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 0, 0, 0),
          lte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 23, 59, 59)
        }
      },
      include: {
        attendees: {
          orderBy: [{ attendeeCategory: 'asc' }, { fullName: 'asc' }]
        }
      }
    });

    if (!session) {
      session = await this.prisma.assemblySession.create({
        data: {
          title,
          sessionDate,
          cutoffTime,
          isCensusFrozen: false,
          maxDebtToleranceMonths: 1,
          status: 'PROGRAMADA'
        },
        include: {
          attendees: true
        }
      });
      
      // Auto-populate eligible members into census
      await this.refreshCensus(session.id);
      
      session = await this.prisma.assemblySession.findUnique({
        where: { id: session.id },
        include: {
          attendees: {
            orderBy: [{ attendeeCategory: 'asc' }, { fullName: 'asc' }]
          }
        }
      });
    }

    return session;
  }

  /**
   * Refresh Census: Check all active titular members against the 1-month tolerance rule
   */
  public async refreshCensus(sessionId: string) {
    const session = await this.prisma.assemblySession.findUnique({ where: { id: sessionId } });
    if (!session || session.isCensusFrozen) return;

    // Remove non-signed attendees before regenerating
    await this.prisma.assemblyAttendee.deleteMany({
      where: { sessionId, hasSigned: false, registeredInSitu: false }
    });

    const titularMembers = await this.prisma.person.findMany({
      where: {
        status: 'ACTIVO',
        titularMemberships: {
          some: {
            status: 'ACTIVA'
          }
        }
      },
      include: {
        titularMemberships: {
          include: { type: true }
        },
        socialFeeAccruals: {
          where: { status: { not: 'PAGADO' } }
        }
      }
    });

    let propCount = 0;
    let instCount = 0;

    for (const p of titularMembers) {
      const membership = p.titularMemberships[0];
      if (!membership) continue;

      // Tolerance rule: max 1 month of unpaid social fees allowed
      const unpaidMonths = p.socialFeeAccruals.length;
      const isEligible = unpaidMonths <= (session.maxDebtToleranceMonths || 1);

      if (!isEligible) continue; // Not eligible unless they pay in-situ

      const isInstitucional = membership.type.code === 'INS' || p.personType === 'EXTERNAL';
      const category = isInstitucional ? 'INSTITUCIONAL' : 'TITULAR_PROPIETARIO';

      if (category === 'TITULAR_PROPIETARIO') propCount++;
      else instCount++;

      const fullName = `${p.paternalSurname || ''} ${p.maternalSurname || ''} ${p.firstName} ${p.secondName || ''}`.trim();

      // Check if already registered
      const exists = await this.prisma.assemblyAttendee.findFirst({
        where: { sessionId, personId: p.id }
      });

      if (!exists) {
        await this.prisma.assemblyAttendee.create({
          data: {
            sessionId,
            personId: p.id,
            membershipNumber: membership.membershipNumber,
            fullName,
            documentId: `${p.documentId} ${p.docExtension || ''}`.trim(),
            attendeeCategory: category,
            eligibleAtCutoff: true,
            registeredInSitu: false,
            hasSigned: false
          }
        });
      }
    }

    const totalEligible = propCount + instCount;
    await this.prisma.assemblySession.update({
      where: { id: sessionId },
      data: {
        totalEligiblePropietarios: propCount,
        totalEligibleInstitucionales: instCount,
        quorumPercentage: totalEligible > 0 ? Number(((session.totalPresent / totalEligible) * 100).toFixed(1)) : 0
      }
    });
  }

  /**
   * Freeze census at 15:00 hrs
   */
  public async freezeCensus(sessionId: string) {
    return this.prisma.assemblySession.update({
      where: { id: sessionId },
      data: {
        isCensusFrozen: true,
        status: 'EN_CURSO'
      }
    });
  }

  /**
   * Register In-Situ Express Payment at Assembly Door and Append to Census
   */
  public async registerInSituPaymentAndQuorum(sessionId: string, data: {
    personId: string;
    inSituReceiptNumber?: string;
  }) {
    const person = await this.prisma.person.findUnique({
      where: { id: data.personId },
      include: {
        titularMemberships: {
          include: { type: true }
        }
      }
    });
    if (!person) throw new Error('Socio no encontrado');

    const membership = person.titularMemberships[0];
    const isInstitucional = membership?.type?.code === 'INS';
    const category = isInstitucional ? 'INSTITUCIONAL' : 'TITULAR_PROPIETARIO';
    const fullName = `${person.paternalSurname || ''} ${person.maternalSurname || ''} ${person.firstName} ${person.secondName || ''}`.trim();

    // Check if attendee already exists in session
    let attendee = await this.prisma.assemblyAttendee.findFirst({
      where: { sessionId, personId: person.id }
    });

    if (!attendee) {
      attendee = await this.prisma.assemblyAttendee.create({
        data: {
          sessionId,
          personId: person.id,
          membershipNumber: membership?.membershipNumber || 'N/A',
          fullName,
          documentId: `${person.documentId} ${person.docExtension || ''}`.trim(),
          attendeeCategory: category,
          eligibleAtCutoff: false,
          registeredInSitu: true,
          inSituReceiptNumber: data.inSituReceiptNumber || `REC-ASAM-${Date.now().toString().slice(-4)}`,
          hasSigned: true,
          signatureTimestamp: new Date(),
          signatureType: 'IN_SITU_EXPRESS'
        }
      });
    } else {
      attendee = await this.prisma.assemblyAttendee.update({
        where: { id: attendee.id },
        data: {
          registeredInSitu: true,
          inSituReceiptNumber: data.inSituReceiptNumber,
          hasSigned: true,
          signatureTimestamp: new Date()
        }
      });
    }

    // Recalculate Quorum
    const totalPresent = await this.prisma.assemblyAttendee.count({
      where: { sessionId, hasSigned: true }
    });

    const session = await this.prisma.assemblySession.findUnique({ where: { id: sessionId } });
    const totalEligible = (session?.totalEligiblePropietarios || 0) + (session?.totalEligibleInstitucionales || 0) + 1;

    await this.prisma.assemblySession.update({
      where: { id: sessionId },
      data: {
        totalPresent,
        quorumPercentage: totalEligible > 0 ? Number(((totalPresent / totalEligible) * 100).toFixed(1)) : 0
      }
    });

    return attendee;
  }

  /**
   * Sign In Attendee (Manual or Digital Signature) and update Quorum in Real-Time
   */
  public async signAttendance(attendeeId: string, signatureType: string = 'MANUAL') {
    const attendee = await this.prisma.assemblyAttendee.update({
      where: { id: attendeeId },
      data: {
        hasSigned: true,
        signatureTimestamp: new Date(),
        signatureType
      }
    });

    const totalPresent = await this.prisma.assemblyAttendee.count({
      where: { sessionId: attendee.sessionId, hasSigned: true }
    });

    const session = await this.prisma.assemblySession.findUnique({ where: { id: attendee.sessionId } });
    const totalEligible = (session?.totalEligiblePropietarios || 0) + (session?.totalEligibleInstitucionales || 0);

    await this.prisma.assemblySession.update({
      where: { id: attendee.sessionId },
      data: {
        totalPresent,
        quorumPercentage: totalEligible > 0 ? Number(((totalPresent / totalEligible) * 100).toFixed(1)) : 0
      }
    });

    return attendee;
  }
}
