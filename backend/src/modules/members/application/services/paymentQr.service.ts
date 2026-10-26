import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

export interface PaymentQrConfigDto {
  bankName?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolder?: string;
  nit?: string;
  instructions?: string;
}

export class PaymentQrService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtiene la configuración del QR de Pagos activo o crea la configuración inicial
   */
  public async getActiveQrConfig() {
    let config = await this.prisma.paymentQrConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (!config) {
      config = await this.prisma.paymentQrConfig.create({
        data: {
          bankName: 'Banco Nacional de Bolivia (BNB)',
          accountNumber: '1000-2938472-01',
          accountType: 'Cuenta Corriente en Bolivianos',
          accountHolder: 'Club Hípico Los Sargentos',
          nit: '1028394021',
          qrImageUrl: '/uploads/payment-qr/qr-pagos.jpg',
          instructions: 'Por favor indique en la glosa su N° de Acción y Apellido. Tras realizar la transferencia bancaria o escaneo QR, adjunte su comprobante aquí para conciliación automática.',
          isActive: true
        }
      });
    }

    return config;
  }

  /**
   * Actualiza la configuración y/o sube una nueva imagen QR desde el panel administrativo
   */
  public async updateQrConfig(data: PaymentQrConfigDto, uploadedFile?: Express.Multer.File, updatedBy?: string) {
    let currentConfig = await this.getActiveQrConfig();

    let newQrImageUrl = currentConfig.qrImageUrl;
    if (uploadedFile) {
      // Ruta relativa servida por Express static (/uploads/payment-qr/filename)
      newQrImageUrl = `/uploads/payment-qr/${uploadedFile.filename}`;
    }

    const updated = await this.prisma.paymentQrConfig.update({
      where: { id: currentConfig.id },
      data: {
        bankName: data.bankName !== undefined ? data.bankName : currentConfig.bankName,
        accountNumber: data.accountNumber !== undefined ? data.accountNumber : currentConfig.accountNumber,
        accountType: data.accountType !== undefined ? data.accountType : currentConfig.accountType,
        accountHolder: data.accountHolder !== undefined ? data.accountHolder : currentConfig.accountHolder,
        nit: data.nit !== undefined ? data.nit : currentConfig.nit,
        instructions: data.instructions !== undefined ? data.instructions : currentConfig.instructions,
        qrImageUrl: newQrImageUrl,
        updatedBy: updatedBy || 'admin',
        updatedAt: new Date()
      }
    });

    return updated;
  }

  /**
   * Obtiene el Estado de Cuentas completo y en tiempo real para el socio autenticado
   */
  public async getMemberAccountStatement(userId: string) {
    const person = await this.prisma.person.findUnique({
      where: { userId },
      include: {
        titularMemberships: {
          include: {
            type: true,
            beneficiaries: true,
            horses: true,
            vehicles: true
          }
        },
        socialFeeAccruals: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          take: 12
        },
        extraordinaryCharges: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        paymentTransactions: {
          orderBy: { paymentDate: 'desc' },
          take: 15
        },
        paymentVouchers: {
          orderBy: { createdAt: 'desc' },
          take: 15
        }
      }
    });

    if (!person || person.titularMemberships.length === 0) {
      return null;
    }

    const primaryMembership = person.titularMemberships[0];
    const qrConfig = await this.getActiveQrConfig();

    // Parse breakdown if available
    let breakdown: any = null;
    try {
      if (primaryMembership.debtBreakdown) {
        breakdown = JSON.parse(primaryMembership.debtBreakdown);
      }
    } catch (e) {}

    const totalDebt = Number(primaryMembership.totalDebt) || 0;
    const debtMonths = primaryMembership.debtMonthsCount || (totalDebt > 0 ? (totalDebt <= 880 ? 1 : 2) : 0);
    const debtStatus = primaryMembership.debtStatus || (totalDebt <= 0 ? 'SIN_DEUDA' : (debtMonths === 1 ? '1_MES' : `${debtMonths}_MESES`));

    // Determinar regla de acceso en garita y molinetes
    let accessStatus: 'GRANTED' | 'WARNING' | 'DENIED' = 'GRANTED';
    let accessMessage = 'Acceso 100% Habilitado - Al Día con Tesorería';

    if (totalDebt > 0) {
      if (debtMonths <= 1 || totalDebt <= 880) {
        accessStatus = 'WARNING';
        accessMessage = `Mora de 1 mes (Bs. ${totalDebt.toFixed(2)}) - Tolerancia temporal activa`;
      } else {
        accessStatus = 'DENIED';
        accessMessage = `Acceso Restringido por Mora (${debtMonths} meses - Bs. ${totalDebt.toFixed(2)})`;
      }
    }

    // Construcción de cuotas pendientes para visualización desglosada
    const pendingDues: Array<{
      id: string;
      concept: string;
      period: string;
      amount: number;
      dueDate: string;
      status: string;
    }> = [];

    if (person.socialFeeAccruals && person.socialFeeAccruals.length > 0) {
      person.socialFeeAccruals.forEach(acc => {
        if (acc.status !== 'PAGADO') {
          pendingDues.push({
            id: acc.id,
            concept: `Cuota Social (${acc.feeType})`,
            period: acc.periodLabel || `${acc.periodMonth}/${acc.periodYear}`,
            amount: Number(acc.residualBalance || acc.baseAmount),
            dueDate: acc.dueDate ? acc.dueDate.toISOString() : 'Fin de mes',
            status: acc.status
          });
        }
      });
    }

    // Si no hay accruals explícitos pero hay totalDebt y breakdown en membership
    if (pendingDues.length === 0 && totalDebt > 0) {
      if (breakdown) {
        if (breakdown.oct26) {
          pendingDues.push({ id: 'due-oct', concept: 'Cuota Social Octubre 2026', period: '10/2026', amount: breakdown.oct26, dueDate: '31/10/2026', status: 'PENDIENTE' });
        }
        if (breakdown.sept26) {
          pendingDues.push({ id: 'due-sept', concept: 'Cuota Social Septiembre 2026', period: '09/2026', amount: breakdown.sept26, dueDate: '30/09/2026', status: 'PENDIENTE' });
        }
        if (breakdown.ago26) {
          pendingDues.push({ id: 'due-ago', concept: 'Cuota Social Agosto 2026', period: '08/2026', amount: breakdown.ago26, dueDate: '31/08/2026', status: 'PENDIENTE' });
        }
        if (breakdown.mas6meses) {
          pendingDues.push({ id: 'due-hist', concept: 'Arrastre Mora Histórica (>6 meses)', period: 'Anteriores', amount: breakdown.mas6meses, dueDate: 'Vencido', status: 'PENDIENTE' });
        }
      }
      if (pendingDues.length === 0) {
        pendingDues.push({
          id: 'due-total',
          concept: 'Cuota Social y Servicios Devengados',
          period: 'Periodo Vigente',
          amount: totalDebt,
          dueDate: 'Fin de mes',
          status: 'PENDIENTE'
        });
      }
    }

    return {
      socio: {
        id: person.id,
        fullName: `${person.firstName} ${person.lastName || person.paternalSurname || ''}`.trim(),
        alphaCode: person.alphaCode || 'CHLS-SOCIO',
        documentId: person.documentId,
        email: person.email,
        phone: person.phone || person.mobile || '',
        category: primaryMembership.type?.name || 'Socio Titular',
        membershipNumber: primaryMembership.membershipNumber,
        membershipStatus: primaryMembership.status,
        admissionDate: primaryMembership.admissionDate
      },
      financialSummary: {
        totalDebt,
        debtStatus,
        debtMonthsCount: debtMonths,
        lastDebtSync: primaryMembership.lastDebtSync,
        accessStatus,
        accessMessage,
        nextDueDate: '05 de Noviembre, 2026'
      },
      pendingDues,
      recentPayments: person.paymentTransactions.map(tx => ({
        id: tx.id,
        code: tx.transactionCode,
        paymentDate: tx.paymentDate,
        method: tx.paymentMethod,
        amount: Number(tx.totalAmount),
        invoiceNumber: tx.invoiceNumber,
        receiptNumber: tx.receiptNumber,
        status: tx.status
      })),
      submittedVouchers: person.paymentVouchers.map(v => ({
        id: v.id,
        referenceNumber: v.referenceNumber,
        amount: Number(v.amount),
        transferDate: v.transferDate,
        voucherUrl: v.voucherUrl,
        concept: v.concept,
        status: v.status,
        reviewNotes: v.reviewNotes,
        createdAt: v.createdAt
      })),
      qrConfig: {
        bankName: qrConfig.bankName,
        accountNumber: qrConfig.accountNumber,
        accountType: qrConfig.accountType,
        accountHolder: qrConfig.accountHolder,
        nit: qrConfig.nit,
        instructions: qrConfig.instructions,
        qrImageUrl: qrConfig.qrImageUrl
      }
    };
  }

  /**
   * El socio sube un comprobante de pago realizado vía QR / Transferencia
   */
  public async submitPaymentVoucher(
    userId: string,
    data: {
      amount: number;
      referenceNumber: string;
      transferDate?: string;
      notes?: string;
      concept?: string;
    },
    uploadedFile: Express.Multer.File
  ) {
    const person = await this.prisma.person.findUnique({
      where: { userId },
      include: { titularMemberships: true }
    });

    if (!person) {
      throw new Error('No se encontró el registro de persona del socio');
    }

    const primaryMembership = person.titularMemberships[0];
    const voucherUrl = `/uploads/vouchers/${uploadedFile.filename}`;

    const voucher = await this.prisma.memberPaymentVoucher.create({
      data: {
        personId: person.id,
        membershipId: primaryMembership?.id || null,
        membershipNumber: primaryMembership?.membershipNumber || 'S/N',
        amount: data.amount,
        referenceNumber: data.referenceNumber,
        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
        voucherUrl,
        concept: data.concept || 'PAGO_CUOTA_EXPENSAS',
        notes: data.notes || null,
        status: 'PENDIENTE'
      }
    });

    return voucher;
  }

  /**
   * Administrador: Listar todos los comprobantes QR reportados
   */
  public async listVouchersForAdmin(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 5), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { membershipNumber: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { person: { firstName: { contains: q, mode: 'insensitive' } } },
        { person: { lastName: { contains: q, mode: 'insensitive' } } },
        { person: { documentId: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.memberPaymentVoucher.count({ where }),
      this.prisma.memberPaymentVoucher.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentId: true,
              email: true,
              phone: true,
              mobile: true
            }
          },
          membership: {
            select: {
              id: true,
              membershipNumber: true,
              totalDebt: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: items.map(v => ({
        id: v.id,
        membershipNumber: v.membershipNumber,
        referenceNumber: v.referenceNumber,
        amount: Number(v.amount),
        transferDate: v.transferDate,
        voucherUrl: v.voucherUrl,
        concept: v.concept,
        notes: v.notes,
        status: v.status,
        reviewedBy: v.reviewedBy,
        reviewedAt: v.reviewedAt,
        reviewNotes: v.reviewNotes,
        createdAt: v.createdAt,
        socio: {
          id: v.person.id,
          fullName: `${v.person.firstName} ${v.person.lastName || ''}`.trim(),
          documentId: v.person.documentId,
          email: v.person.email,
          phone: v.person.phone || v.person.mobile
        },
        membership: v.membership ? {
          id: v.membership.id,
          number: v.membership.membershipNumber,
          totalDebt: Number(v.membership.totalDebt)
        } : null
      }))
    };
  }

  /**
   * Administrador: Revisar, Aprobar o Rechazar Comprobante de Pago
   */
  public async reviewVoucher(
    voucherId: string,
    action: 'APROBADO' | 'RECHAZADO',
    reviewNotes?: string,
    reviewedBy?: string
  ) {
    const voucher = await this.prisma.memberPaymentVoucher.findUnique({
      where: { id: voucherId },
      include: {
        membership: true,
        person: true
      }
    });

    if (!voucher) {
      throw new Error('Comprobante no encontrado');
    }

    const updatedVoucher = await this.prisma.memberPaymentVoucher.update({
      where: { id: voucherId },
      data: {
        status: action,
        reviewedBy: reviewedBy || 'admin',
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      }
    });

    // Si se aprueba, crear automáticamente la transacción de pago y deducir la deuda
    if (action === 'APROBADO') {
      const txCode = `QR-${Date.now().toString().slice(-6)}`;
      
      await this.prisma.memberPaymentTransaction.create({
        data: {
          transactionCode: txCode,
          personId: voucher.personId,
          paymentDate: voucher.transferDate,
          paymentMethod: 'PAGO_QR_BANCARIO',
          currency: 'BOB',
          totalAmount: voucher.amount,
          invoicedAmount: voucher.amount,
          receiptNumber: `REC-${voucher.referenceNumber}`,
          cashierUsername: reviewedBy || 'ADMIN_SISTEMA',
          notes: `Pago verificado por comprobante QR #${voucher.referenceNumber}. ${reviewNotes || ''}`.trim(),
          status: 'APROBADO'
        }
      });

      // Reducir la mora en la membresía si existe
      if (voucher.membershipId) {
        const currentDebt = Number(voucher.membership?.totalDebt || 0);
        const newDebt = Math.max(0, currentDebt - Number(voucher.amount));
        const newMonths = newDebt === 0 ? 0 : (newDebt <= 880 ? 1 : Math.ceil(newDebt / 880));
        const newStatus = newDebt === 0 ? 'SIN_DEUDA' : (newMonths === 1 ? '1_MES' : `${newMonths}_MESES`);

        await this.prisma.membership.update({
          where: { id: voucher.membershipId },
          data: {
            totalDebt: newDebt,
            debtStatus: newStatus,
            debtMonthsCount: newMonths
          }
        });
      }
    }

    return updatedVoucher;
  }
}
