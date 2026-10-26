import { api } from '@config/api';

export interface SocioAccountStatementResponse {
  socio: {
    id: string;
    fullName: string;
    alphaCode: string;
    documentId: string;
    email: string | null;
    phone: string;
    category: string;
    membershipNumber: string;
    membershipStatus: string;
    admissionDate: string;
  };
  financialSummary: {
    totalDebt: number;
    debtStatus: string;
    debtMonthsCount: number;
    lastDebtSync: string | null;
    accessStatus: 'GRANTED' | 'WARNING' | 'DENIED';
    accessMessage: string;
    nextDueDate: string;
  };
  pendingDues: Array<{
    id: string;
    concept: string;
    period: string;
    amount: number;
    dueDate: string;
    status: string;
  }>;
  recentPayments: Array<{
    id: string;
    code: string;
    paymentDate: string;
    method: string;
    amount: number;
    invoiceNumber: string | null;
    receiptNumber: string | null;
    status: string;
  }>;
  submittedVouchers: Array<{
    id: string;
    referenceNumber: string;
    amount: number;
    transferDate: string;
    voucherUrl: string;
    concept: string;
    status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    reviewNotes: string | null;
    createdAt: string;
  }>;
  qrConfig: {
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountHolder: string;
    nit: string;
    instructions: string;
    qrImageUrl: string;
  };
}

export const getAssetUrl = (relativePath?: string | null): string => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('data:')) {
    return relativePath;
  }
  const isDev = typeof window !== 'undefined' && window.location.port === '5173';
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  if (isDev) {
    return `http://${window.location.hostname}:5000${cleanPath}`;
  }
  return cleanPath;
};

export const memberPortalApi = {
  /**
   * Obtiene el Estado de Cuentas completo del socio actual
   */
  getMyAccountStatement: async (): Promise<SocioAccountStatementResponse> => {
    const res = await api.get('/members/me/account-statement');
    return res.data.data;
  },

  /**
   * Sube un comprobante de pago bancario / QR
   */
  submitPaymentVoucher: async (formData: FormData) => {
    const res = await api.post('/members/me/payment-voucher', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  /**
   * Obtiene la configuración de pago QR pública / vigente
   */
  getPaymentQrConfig: async () => {
    const res = await api.get('/members/payment-qr/config');
    return res.data.data;
  }
};
