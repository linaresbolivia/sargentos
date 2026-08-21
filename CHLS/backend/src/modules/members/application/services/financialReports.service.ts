import { PrismaClient } from '@prisma/client';

export class FinancialReportsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Saneamiento de la Cartera Especial (Novus fix)
   * Computes ONLY real accrued overdue debt at query date
   * Buckets: Mes 1 (Vigente), Mes 2 (Gracia), Mes 3 a 6 (Mora Ordinaria), Mes > 6 (Cartera Pesada / Judicial)
   */
  public async getCarteraEspecialSaneada(filters?: {
    categoryCode?: string;
    statusFilter?: string;
    maxDateStr?: string;
  }) {
    const targetDate = filters?.maxDateStr ? new Date(filters.maxDateStr) : new Date();

    const persons = await this.prisma.person.findMany({
      where: {
        status: filters?.statusFilter && filters?.statusFilter !== 'ALL' ? filters.statusFilter : undefined
      },
      include: {
        titularMemberships: {
          include: { type: true }
        },
        socialFeeAccruals: {
          where: {
            status: { not: 'PAGADO' },
            dueDate: { lte: targetDate }
          },
          orderBy: { dueDate: 'asc' }
        },
        extraordinaryCharges: {
          where: {
            status: { not: 'PAGADO' },
            dueDate: { lte: targetDate }
          },
          orderBy: { dueDate: 'asc' }
        },
        membershipPlans: {
          include: {
            installments: {
              where: {
                status: { not: 'PAGADO' },
                dueDate: { lte: targetDate }
              },
              orderBy: { dueDate: 'asc' }
            }
          }
        }
      }
    });

    const reportRows: Array<{
      personId: string;
      membershipNumber: string;
      fullName: string;
      alphaCode: string | null;
      category: string;
      status: string;
      mora1a2Meses: number; // Gracia
      mora3a6Meses: number; // Mora
      moraMas6Meses: number; // Cartera Pesada
      totalMoraRealDevengada: number;
      unpaidSocialCount: number;
      unpaidChargesCount: number;
      overdueCdpInstallmentsCount: number;
    }> = [];

    let totalCarteraMes1a2 = 0;
    let totalCarteraMes3a6 = 0;
    let totalCarteraMesMayor6 = 0;
    let totalCarteraGeneral = 0;

    const now = targetDate.getTime();

    for (const p of persons) {
      const membership = p.titularMemberships[0];
      if (filters?.categoryCode && filters.categoryCode !== 'ALL' && membership?.type.code !== filters.categoryCode) {
        continue;
      }

      let m1a2 = 0;
      let m3a6 = 0;
      let mMayor6 = 0;

      // Classify Social fees
      p.socialFeeAccruals.forEach(acc => {
        const bal = Number(acc.residualBalance || acc.baseAmount);
        const ageDays = (now - new Date(acc.dueDate).getTime()) / (1000 * 60 * 60 * 24);

        if (ageDays <= 60) m1a2 += bal;
        else if (ageDays <= 180) m3a6 += bal;
        else mMayor6 += bal;
      });

      // Classify Extraordinary charges (Boxes, vet, schools)
      p.extraordinaryCharges.forEach(chg => {
        const bal = Number(chg.residualBalance || chg.amount);
        const ageDays = (now - new Date(chg.dueDate).getTime()) / (1000 * 60 * 60 * 24);

        if (ageDays <= 60) m1a2 += bal;
        else if (ageDays <= 180) m3a6 += bal;
        else mMayor6 += bal;
      });

      // Classify Overdue CDP installments (ONLY THOSE ACCRUED!)
      let overdueCdpCount = 0;
      p.membershipPlans.forEach(plan => {
        plan.installments.forEach(inst => {
          overdueCdpCount++;
          const bal = Number(inst.balanceRemaining || inst.totalInstallment);
          const ageDays = (now - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24);

          if (ageDays <= 60) m1a2 += bal;
          else if (ageDays <= 180) m3a6 += bal;
          else mMayor6 += bal;
        });
      });

      const totalMoraSocio = m1a2 + m3a6 + mMayor6;

      if (totalMoraSocio > 0) {
        totalCarteraMes1a2 += m1a2;
        totalCarteraMes3a6 += m3a6;
        totalCarteraMesMayor6 += mMayor6;
        totalCarteraGeneral += totalMoraSocio;

        reportRows.push({
          personId: p.id,
          membershipNumber: membership?.membershipNumber || 'N/A',
          fullName: `${p.paternalSurname || ''} ${p.maternalSurname || ''} ${p.firstName} ${p.secondName || ''}`.trim(),
          alphaCode: p.alphaCode,
          category: membership?.type.name || 'Sin Categoría',
          status: p.status,
          mora1a2Meses: Number(m1a2.toFixed(2)),
          mora3a6Meses: Number(m3a6.toFixed(2)),
          moraMas6Meses: Number(mMayor6.toFixed(2)),
          totalMoraRealDevengada: Number(totalMoraSocio.toFixed(2)),
          unpaidSocialCount: p.socialFeeAccruals.length,
          unpaidChargesCount: p.extraordinaryCharges.length,
          overdueCdpInstallmentsCount: overdueCdpCount
        });
      }
    }

    reportRows.sort((a, b) => b.totalMoraRealDevengada - a.totalMoraRealDevengada);

    return {
      asOfDate: targetDate,
      summary: {
        totalSociosMorosos: reportRows.length,
        totalCarteraMes1a2: Number(totalCarteraMes1a2.toFixed(2)),
        totalCarteraMes3a6: Number(totalCarteraMes3a6.toFixed(2)),
        totalCarteraMesMayor6: Number(totalCarteraMesMayor6.toFixed(2)),
        totalCarteraGeneral: Number(totalCarteraGeneral.toFixed(2))
      },
      rows: reportRows
    };
  }

  /**
   * Monthly Revenue Collection Summary
   */
  public async getMonthlyRevenueSummary(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const start = new Date(targetYear, 0, 1);
    const end = new Date(targetYear, 11, 31, 23, 59, 59);

    const payments = await this.prisma.memberPaymentTransaction.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        status: 'APROBADO'
      },
      orderBy: { paymentDate: 'asc' }
    });

    const monthlyBreakdown: Array<{
      monthNumber: number;
      monthName: string;
      totalFacturado: number;
      totalReciboCDP: number;
      totalRecaudado: number;
      count: number;
    }> = [];

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (let m = 0; m < 12; m++) {
      monthlyBreakdown.push({
        monthNumber: m + 1,
        monthName: monthNames[m],
        totalFacturado: 0,
        totalReciboCDP: 0,
        totalRecaudado: 0,
        count: 0
      });
    }

    payments.forEach(p => {
      const m = new Date(p.paymentDate).getMonth();
      monthlyBreakdown[m].totalFacturado += Number(p.invoicedAmount);
      monthlyBreakdown[m].totalReciboCDP += Number(p.cdpReceiptAmount);
      monthlyBreakdown[m].totalRecaudado += Number(p.totalAmount);
      monthlyBreakdown[m].count += 1;
    });

    return {
      year: targetYear,
      monthlyBreakdown
    };
  }
}
