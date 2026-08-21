import { PrismaClient } from '@prisma/client';

export class CashierBillingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get Unified Debt Sheet for a Member
   * Separates:
   * 1. Deuda por Fechas (Cuotas Sociales, Boxes Hípicos, Veterinaria, Escuelas)
   * 2. Deuda por Cuota (Cuota de Participación CDP 1/60...)
   */
  public async getMemberDebtSheet(personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        titularMemberships: {
          include: {
            type: true,
            plans: {
              where: { status: 'APROBADO' },
              include: {
                installments: {
                  where: { status: { not: 'PAGADO' } },
                  orderBy: { installmentNumber: 'asc' }
                }
              }
            }
          }
        },
        socialFeeAccruals: {
          where: { status: { not: 'PAGADO' } },
          orderBy: { dueDate: 'asc' }
        },
        extraordinaryCharges: {
          where: { status: { not: 'PAGADO' } },
          include: { veterinaryDetails: true },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!person) throw new Error('Socio no encontrado');

    // 1. Deuda por Fechas
    const itemsFechas = [
      ...person.socialFeeAccruals.map(acc => ({
        id: acc.id,
        type: 'SOCIAL_FEE',
        concept: `Cuota Social (${acc.periodLabel}) - Tipo: ${acc.feeType}`,
        periodLabel: acc.periodLabel,
        dueDate: acc.dueDate,
        baseAmount: Number(acc.baseAmount),
        paidAmount: Number(acc.paidAmount),
        balance: Number(acc.residualBalance || acc.baseAmount),
        isTaxable: true,
        details: null
      })),
      ...person.extraordinaryCharges.map(chg => ({
        id: chg.id,
        type: 'EXTRAORDINARY_CHARGE',
        concept: `${chg.serviceName} (${chg.serviceCategory})`,
        periodLabel: `${chg.periodMonth}/${chg.periodYear}`,
        dueDate: chg.dueDate,
        baseAmount: Number(chg.amount),
        paidAmount: Number(chg.paidAmount),
        balance: Number(chg.residualBalance || chg.amount),
        isTaxable: true,
        clinicalNoteNumber: chg.clinicalNoteNumber,
        details: chg.veterinaryDetails
      }))
    ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // 2. Deuda por Cuotas (CDP)
    const activePlan = person.titularMemberships[0]?.plans[0];
    const itemsCuotas = (activePlan?.installments || []).map(inst => ({
      id: inst.id,
      type: 'CDP_INSTALLMENT',
      concept: `Cuota CDP ${inst.installmentNumber}/${activePlan?.monthsTerm}`,
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      incomeFeePart: Number(inst.incomeFeePart), // 60% Facturado
      cdpPart: Number(inst.cdpPart),             // 40% Recibo
      totalInstallment: Number(inst.totalInstallment),
      amountPaid: Number(inst.amountPaid),
      balance: Number(inst.balanceRemaining),
      isTaxable: false
    }));

    const totalDeudaFechas = itemsFechas.reduce((sum, item) => sum + item.balance, 0);
    const totalDeudaCuotas = itemsCuotas.reduce((sum, item) => sum + item.balance, 0);

    return {
      person: {
        id: person.id,
        documentId: person.documentId,
        docExtension: person.docExtension,
        alphaCode: person.alphaCode,
        fullName: `${person.paternalSurname || ''} ${person.maternalSurname || ''} ${person.firstName} ${person.secondName || ''}`.trim(),
        fiscalNit: person.fiscalNit || person.documentId,
        fiscalCompanyName: person.fiscalCompanyName || `${person.firstName} ${person.lastName || ''}`.trim(),
        status: person.status,
        membershipNumber: person.titularMemberships[0]?.membershipNumber,
        category: person.titularMemberships[0]?.type.name
      },
      itemsFechas,
      itemsCuotas,
      totals: {
        totalDeudaFechas,
        totalDeudaCuotas,
        grandTotal: totalDeudaFechas + totalDeudaCuotas
      }
    };
  }

  /**
   * Process Cashier Payment with FIFO and Dual Invoicing (Factura + Recibo Oficial)
   */
  public async processPayment(data: {
    personId: string;
    cashierUsername: string;
    shiftNumber?: string;
    cashRegisterRef?: string;
    paymentMethod: string; // EFECTIVO, TARJETA, TRANSFERENCIA, DEBITO, CHEQUE
    currency?: string;
    exchangeRate?: number;
    amountPaid: number;
    fiscalNit?: string;
    fiscalRazonSocial?: string;
    selectedItemIds?: Array<{ id: string; type: 'SOCIAL_FEE' | 'CDP_INSTALLMENT' | 'EXTRAORDINARY_CHARGE'; amount: number }>;
    notes?: string;
  }) {
    const person = await this.prisma.person.findUnique({
      where: { id: data.personId }
    });
    if (!person) throw new Error('Socio no encontrado');

    const totalPaid = Number(data.amountPaid);
    let remainingToAllocate = totalPaid;
    
    let invoicedAmount = 0;   // 60% Derecho ingreso + cuotas sociales + servicios
    let cdpReceiptAmount = 0; // 40% Cuota de participación CDP

    const txnCode = `CSO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNumber = `FACT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const allocationsToCreate: Array<{
      conceptType: string;
      allocatedAmount: number;
      socialFeeId?: string;
      installmentId?: string;
      extraordinaryChargeId?: string;
      notes?: string;
    }> = [];

    // If specific items provided, allocate to them; otherwise, apply FIFO on Deuda por Fechas then CDP
    if (data.selectedItemIds && data.selectedItemIds.length > 0) {
      for (const item of data.selectedItemIds) {
        if (remainingToAllocate <= 0) break;
        const alloc = Math.min(remainingToAllocate, Number(item.amount));
        remainingToAllocate -= alloc;

        if (item.type === 'SOCIAL_FEE') {
          invoicedAmount += alloc;
          allocationsToCreate.push({
            conceptType: 'SOCIAL_FEE',
            allocatedAmount: alloc,
            socialFeeId: item.id
          });

          // Update SocialFee
          const fee = await this.prisma.socialFeeAccrual.findUnique({ where: { id: item.id } });
          if (fee) {
            const newPaid = Number(fee.paidAmount) + alloc;
            const newBalance = Math.max(0, Number(fee.baseAmount) - newPaid);
            await this.prisma.socialFeeAccrual.update({
              where: { id: item.id },
              data: {
                paidAmount: newPaid,
                residualBalance: newBalance,
                status: newBalance === 0 ? 'PAGADO' : 'PARCIAL',
                invoiceNumber
              }
            });
          }
        } else if (item.type === 'EXTRAORDINARY_CHARGE') {
          invoicedAmount += alloc;
          allocationsToCreate.push({
            conceptType: 'EXTRAORDINARY_CHARGE',
            allocatedAmount: alloc,
            extraordinaryChargeId: item.id
          });

          const chg = await this.prisma.extraordinaryCharge.findUnique({ where: { id: item.id } });
          if (chg) {
            const newPaid = Number(chg.paidAmount) + alloc;
            const newBalance = Math.max(0, Number(chg.amount) - newPaid);
            await this.prisma.extraordinaryCharge.update({
              where: { id: item.id },
              data: {
                paidAmount: newPaid,
                residualBalance: newBalance,
                status: newBalance === 0 ? 'PAGADO' : 'PARCIAL',
                invoiceNumber
              }
            });
          }
        } else if (item.type === 'CDP_INSTALLMENT') {
          // 60% goes to Factura, 40% goes to Recibo
          const partIncome = Number((alloc * 0.60).toFixed(2));
          const partCdp = Number((alloc * 0.40).toFixed(2));
          invoicedAmount += partIncome;
          cdpReceiptAmount += partCdp;

          allocationsToCreate.push({
            conceptType: 'CDP_INSTALLMENT',
            allocatedAmount: alloc,
            installmentId: item.id
          });

          const inst = await this.prisma.membershipInstallment.findUnique({ where: { id: item.id } });
          if (inst) {
            const newPaid = Number(inst.amountPaid) + alloc;
            const newBalance = Math.max(0, Number(inst.totalInstallment) - newPaid);
            await this.prisma.membershipInstallment.update({
              where: { id: item.id },
              data: {
                amountPaid: newPaid,
                balanceRemaining: newBalance,
                status: newBalance === 0 ? 'PAGADO' : 'PARCIAL',
                paidAt: newBalance === 0 ? new Date() : null,
                invoiceNumber,
                receiptNumber
              }
            });
          }
        }
      }
    }

    // Create Main Transaction
    const payment = await this.prisma.memberPaymentTransaction.create({
      data: {
        transactionCode: txnCode,
        personId: data.personId,
        paymentDate: new Date(),
        paymentMethod: data.paymentMethod || 'EFECTIVO',
        currency: data.currency || 'BOB',
        exchangeRate: data.exchangeRate || 6.96,
        totalAmount: totalPaid,
        invoicedAmount,
        cdpReceiptAmount,
        invoiceNumber: invoicedAmount > 0 ? invoiceNumber : null,
        receiptNumber: cdpReceiptAmount > 0 ? receiptNumber : null,
        fiscalNit: data.fiscalNit || person.fiscalNit || person.documentId,
        fiscalRazonSocial: data.fiscalRazonSocial || person.fiscalCompanyName || `${person.firstName} ${person.lastName || ''}`.trim(),
        cashRegisterRef: data.cashRegisterRef || 'CAJA_CENTRAL',
        cashierUsername: data.cashierUsername,
        shiftNumber: data.shiftNumber || 'TURNO_1',
        notes: data.notes,
        status: 'APROBADO'
      }
    });

    // Create allocations
    for (const a of allocationsToCreate) {
      await this.prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          conceptType: a.conceptType,
          allocatedAmount: a.allocatedAmount,
          socialFeeId: a.socialFeeId,
          installmentId: a.installmentId,
          extraordinaryChargeId: a.extraordinaryChargeId,
          notes: a.notes
        }
      });
    }

    return this.prisma.memberPaymentTransaction.findUnique({
      where: { id: payment.id },
      include: {
        allocations: {
          include: {
            socialFee: true,
            installment: true,
            extraordinaryCharge: true
          }
        },
        person: true
      }
    });
  }

  /**
   * Daily Cash Closing / Arqueo Diario de Caja
   */
  public async getDailyCashClosing(dateStr?: string, cashierUsername?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const where: any = {
      paymentDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'APROBADO'
    };

    if (cashierUsername && cashierUsername !== 'ALL') {
      where.cashierUsername = cashierUsername;
    }

    const transactions = await this.prisma.memberPaymentTransaction.findMany({
      where,
      include: {
        person: true,
        allocations: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    let totalRecaudado = 0;
    let totalFacturado = 0;
    let totalRecibosCDP = 0;

    const byMethod: Record<string, number> = {
      EFECTIVO: 0,
      TARJETA: 0,
      TRANSFERENCIA: 0,
      DEBITO: 0,
      CHEQUE: 0
    };

    transactions.forEach(t => {
      const amt = Number(t.totalAmount);
      totalRecaudado += amt;
      totalFacturado += Number(t.invoicedAmount);
      totalRecibosCDP += Number(t.cdpReceiptAmount);

      const m = t.paymentMethod || 'EFECTIVO';
      byMethod[m] = (byMethod[m] || 0) + amt;
    });

    return {
      date: targetDate,
      cashier: cashierUsername || 'TODOS',
      summary: {
        totalRecaudado,
        totalFacturado,
        totalRecibosCDP,
        count: transactions.length,
        byMethod
      },
      transactions
    };
  }
}
