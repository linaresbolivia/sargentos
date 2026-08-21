import { PrismaClient } from '@prisma/client';

export class MembershipSalesAuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Formulate Sales Plan (Ventas - Eduardo)
   * Enforces 60% Derecho de Ingreso (Facturado) + 40% Cuota de Participación CDP (Recibo Oficial)
   * Generates Amortization Table (1 to 60 installments or 1-month virtual cash plan)
   */
  public async createSalesPlan(data: {
    membershipId: string;
    titularId: string;
    totalAmount: number; // e.g. 69600 Bs
    downPayment: number; // e.g. 10000 Bs
    monthsTerm: number;  // e.g. 60
    monthlyInterestRate?: number; // e.g. 0.00
    acquisitionType?: string; // COMPRA_DIRECTA, TRANSFERENCIA, HERENCIA
    paymentMethodType?: string; // CREDITO, CONTADO
    sellerName?: string;
    startDate?: string;
    firstDueDate?: string;
    originalSocioId?: string;
    folioNumber?: string;
  }) {
    const total = Number(data.totalAmount);
    const down = Number(data.downPayment || 0);
    const financed = Math.max(0, total - down);
    const months = data.paymentMethodType === 'CONTADO' ? 1 : Math.max(1, data.monthsTerm || 60);
    const rate = Number(data.monthlyInterestRate || 0);

    // Mandatory 60 / 40 legal split
    const incomeFeeAmount = Number((total * 0.60).toFixed(2));
    const cdpAmount = Number((total * 0.40).toFixed(2));

    // Calculate fixed monthly installment
    let fixedMonthly = 0;
    if (rate > 0) {
      const r = rate / 100;
      fixedMonthly = Number(((financed * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)).toFixed(2));
    } else {
      fixedMonthly = Number((financed / months).toFixed(2));
    }

    const txnCode = `AME-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const start = data.startDate ? new Date(data.startDate) : new Date();
    const firstDue = data.firstDueDate ? new Date(data.firstDueDate) : new Date(start.getFullYear(), start.getMonth() + 1, 1);

    // Create Plan in EN_REVISION state
    const plan = await this.prisma.membershipPlan.create({
      data: {
        membershipId: data.membershipId,
        titularId: data.titularId,
        transactionNumber: txnCode,
        acquisitionType: data.acquisitionType || 'COMPRA_DIRECTA',
        status: 'EN_REVISION',
        sellerName: data.sellerName || 'Eduardo (Ventas)',
        totalAmount: total,
        incomeFeeAmount,
        cdpAmount,
        downPayment: down,
        financedAmount: financed,
        monthsTerm: months,
        monthlyInterestRate: rate,
        fixedMonthlyInstallment: fixedMonthly,
        paymentMethodType: data.paymentMethodType || 'CREDITO',
        startDate: start,
        firstDueDate: firstDue,
        originalSocioId: data.originalSocioId,
        folioNumber: data.folioNumber,
        isFullyPaid: financed === 0
      }
    });

    // Generate Installments
    let remainingCapital = financed;
    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + (i - 1), 1);
      
      let interest = 0;
      let capital = fixedMonthly;
      if (rate > 0) {
        interest = Number((remainingCapital * (rate / 100)).toFixed(2));
        capital = Number((fixedMonthly - interest).toFixed(2));
      }
      
      remainingCapital = Math.max(0, remainingCapital - capital);

      // Split installment into 60% income fee and 40% CDP
      const installmentIncome = Number((fixedMonthly * 0.60).toFixed(2));
      const installmentCdp = Number((fixedMonthly * 0.40).toFixed(2));

      await this.prisma.membershipInstallment.create({
        data: {
          planId: plan.id,
          installmentNumber: i,
          dueDate,
          incomeFeePart: installmentIncome,
          cdpPart: installmentCdp,
          capitalAmount: capital,
          interestAmount: interest,
          totalInstallment: fixedMonthly,
          balanceRemaining: fixedMonthly,
          status: 'PENDIENTE'
        }
      });
    }

    return this.prisma.membershipPlan.findUnique({
      where: { id: plan.id },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' }
        },
        titular: true,
        membership: {
          include: { type: true }
        }
      }
    });
  }

  /**
   * List Pending Plans for Monica (Recaudaciones / Auditoría)
   */
  public async listPlans(statusFilter?: string) {
    return this.prisma.membershipPlan.findMany({
      where: statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {},
      include: {
        titular: true,
        membership: {
          include: {
            type: true,
            beneficiaries: {
              include: { person: true }
            }
          }
        },
        installments: {
          orderBy: { installmentNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Audit Plan (Mónica - Recaudaciones)
   */
  public async auditPlan(planId: string, data: {
    action: 'APROBAR' | 'OBSERVAR' | 'CANCELAR';
    auditedBy: string;
    auditNotes?: string;
  }) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: { membership: true }
    });

    if (!plan) throw new Error('Plan de membresía no encontrado');

    const newStatus = data.action === 'APROBAR' ? 'APROBADO' :
                      data.action === 'OBSERVAR' ? 'OBSERVADO' : 'CANCELADO';

    const updatedPlan = await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        status: newStatus,
        auditedBy: data.auditedBy,
        auditDate: new Date(),
        auditNotes: data.auditNotes
      }
    });

    if (data.action === 'APROBAR') {
      // Activate membership and set real debt
      await this.prisma.membership.update({
        where: { id: plan.membershipId },
        data: {
          status: 'ACTIVA',
          activationDate: new Date(),
          purchaseValue: plan.totalAmount,
          currentValue: plan.totalAmount
        }
      });
    }

    return updatedPlan;
  }
}
