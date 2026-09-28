import { PrismaClient } from '@prisma/client';

export class PredictiveAlertsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Scan Dependents turning 25 years old
   * Disables dependent card and offers Pre-Asociado / Junior Mayor
   */
  public async scanDependentMajorityAlerts() {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: {
        relationship: 'HIJO'
      },
      include: {
        person: true,
        membership: {
          include: {
            titular: true
          }
        }
      }
    });

    const alerts: Array<{
      beneficiaryId: string;
      personId: string;
      fullName: string;
      birthDate: Date | null;
      ageYears: number;
      titularName: string;
      titularPhone: string | null;
      membershipNumber: string;
      status: string;
      alertType: 'MAYOR_DE_25' | 'PROXIMO_A_CUMPLIR';
      suggestedAction: string;
    }> = [];

    const now = new Date();

    for (const b of beneficiaries) {
      if (!b.birthDate) continue;

      const birth = new Date(b.birthDate);
      const ageYears = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

      const fullName = `${b.person.paternalSurname || ''} ${b.person.maternalSurname || ''} ${b.person.firstName} ${b.person.secondName || ''}`.trim();
      const titularName = `${b.membership.titular.paternalSurname || ''} ${b.membership.titular.firstName}`.trim();

      if (ageYears >= 25) {
        // Auto-lock if not already locked
        if (b.status !== 'BLOQUEADO_EDAD') {
          await this.prisma.beneficiary.update({
            where: { id: b.id },
            data: { status: 'BLOQUEADO_EDAD', isUnder25: false }
          });
        }

        alerts.push({
          beneficiaryId: b.id,
          personId: b.personId,
          fullName,
          birthDate: b.birthDate,
          ageYears,
          titularName,
          titularPhone: b.membership.titular.phone || b.membership.titular.mobile,
          membershipNumber: b.membership.membershipNumber,
          status: 'BLOQUEADO_EDAD',
          alertType: 'MAYOR_DE_25',
          suggestedAction: 'Ofrecer Pre-Asociado (880 Bs/mes 1+1 año) o Compra de Título Junior Mayor'
        });
      } else if (ageYears === 24) {
        alerts.push({
          beneficiaryId: b.id,
          personId: b.personId,
          fullName,
          birthDate: b.birthDate,
          ageYears,
          titularName,
          titularPhone: b.membership.titular.phone || b.membership.titular.mobile,
          membershipNumber: b.membership.membershipNumber,
          status: b.status,
          alertType: 'PROXIMO_A_CUMPLIR',
          suggestedAction: 'Preparar carta de transición a Pre-Asociado o venta de acción preferencial'
        });
      }
    }

    return alerts;
  }

  /**
   * Scan Candidates for Socio Honorario
   * Criteria: Age >= 60 + Seniority >= 20 years + Total debt = 0 Bs
   */
  public async scanHonoraryCandidates() {
    const activeTitulars = await this.prisma.person.findMany({
      where: {
        status: 'ACTIVO',
        personType: { not: 'HONORARIO' },
        titularMemberships: {
          some: { status: 'ACTIVA' }
        }
      },
      include: {
        titularMemberships: {
          include: { type: true }
        },
        socialFeeAccruals: {
          where: { status: { not: 'PAGADO' } }
        },
        extraordinaryCharges: {
          where: { status: { not: 'PAGADO' } }
        }
      }
    });

    const candidates: Array<{
      personId: string;
      fullName: string;
      documentId: string;
      birthDate: Date | null;
      ageYears: number;
      admissionDate: Date;
      seniorityYears: number;
      totalUnpaidDebt: number;
      isEligible: boolean;
      membershipNumber: string;
      currentCategory: string;
    }> = [];

    const now = new Date();

    for (const p of activeTitulars) {
      const membership = p.titularMemberships[0];
      if (!membership) continue;

      const birth = p.birthDate ? new Date(p.birthDate) : null;
      const ageYears = birth ? Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;

      const admission = p.depositVoucherDate || membership.admissionDate || p.createdAt;
      const seniorityYears = Math.floor((now.getTime() - new Date(admission).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

      const unpaidSocial = p.socialFeeAccruals.reduce((sum, item) => sum + Number(item.residualBalance || item.baseAmount), 0);
      const unpaidExtra = p.extraordinaryCharges.reduce((sum, item) => sum + Number(item.residualBalance || item.amount), 0);
      const totalUnpaidDebt = unpaidSocial + unpaidExtra;

      const isEligible = ageYears >= 60 && seniorityYears >= 20 && totalUnpaidDebt === 0;

      if (ageYears >= 59 && seniorityYears >= 19) {
        candidates.push({
          personId: p.id,
          fullName: `${p.paternalSurname || ''} ${p.maternalSurname || ''} ${p.firstName} ${p.secondName || ''}`.trim(),
          documentId: `${p.documentId} ${p.docExtension || ''}`.trim(),
          birthDate: p.birthDate,
          ageYears,
          admissionDate: admission,
          seniorityYears,
          totalUnpaidDebt,
          isEligible,
          membershipNumber: membership.membershipNumber,
          currentCategory: membership.type.name
        });
      }
    }

    return candidates;
  }

  /**
   * Promote Member to Socio Honorario and Calculate Prorated Advance Fees Refund
   */
  public async promoteToHonorary(personId: string, bankDetails?: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountType?: string;
    beneficiaryName?: string;
    monthsInFavor?: number;
  }) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        titularMemberships: {
          include: { type: true }
        }
      }
    });

    if (!person) throw new Error('Socio no encontrado');

    // Update Person & Membership to HONORARIO
    await this.prisma.person.update({
      where: { id: personId },
      data: {
        personType: 'HONORARIO',
        status: 'HONORARIO'
      }
    });

    // Check if membership type for HONORARIO exists
    let honType = await this.prisma.membershipType.findUnique({ where: { code: 'HON' } });
    if (honType && person.titularMemberships[0]) {
      await this.prisma.membership.update({
        where: { id: person.titularMemberships[0].id },
        data: { typeId: honType.id }
      });
    }

    let refundRequest = null;

    // If member prepaid advance months (e.g. 7 months remaining from annual payment), generate Treasury Refund Request
    if (bankDetails && bankDetails.monthsInFavor && bankDetails.monthsInFavor > 0) {
      const monthlyFee = 880;
      const grossRefund = bankDetails.monthsInFavor * monthlyFee;
      const taxRetention = Number((grossRefund * 0.125).toFixed(2)); // 12.5% tax retention
      const netRefund = Number((grossRefund - taxRetention).toFixed(2));
      const reqCode = `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      refundRequest = await this.prisma.membershipRefundRequest.create({
        data: {
          requestCode: reqCode,
          personId: person.id,
          reason: `Prorrateo de anualidad por pase a Socio Honorario (${bankDetails.monthsInFavor} meses a favor)`,
          monthsInFavor: bankDetails.monthsInFavor,
          monthlyFee,
          grossRefundAmount: grossRefund,
          taxRetentionPercentage: 12.5,
          taxRetentionAmount: taxRetention,
          netRefundAmount: netRefund,
          bankName: bankDetails.bankName,
          bankAccountNumber: bankDetails.bankAccountNumber,
          bankAccountType: bankDetails.bankAccountType || 'CUENTA_CORRIENTE',
          beneficiaryName: bankDetails.beneficiaryName || `${person.firstName} ${person.lastName || ''}`.trim(),
          status: 'PENDIENTE_TESORERIA'
        }
      });
    }

    return {
      success: true,
      personId: person.id,
      newStatus: 'HONORARIO',
      refundRequest
    };
  }
}
