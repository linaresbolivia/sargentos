import { api } from '@config/api';

export const memberAdminApi = {
  // 1. Directory & Search
  searchMembers: async (q: string = '', category: string = '', status: string = '') => {
    const res = await api.get('/members/admin/search', { params: { q, category, status } });
    return res.data;
  },

  createMember: async (data: any) => {
    const res = await api.post('/members/admin/create', data);
    return res.data;
  },

  getMemberDetail: async (id: string) => {
    const res = await api.get(`/members/admin/detail/${id}`);
    return res.data;
  },

  // 2. Sales & Audit CDP
  listSalesPlans: async (status: string = '') => {
    const res = await api.get('/members/admin/sales/plans', { params: { status } });
    return res.data;
  },

  createSalesPlan: async (data: any) => {
    const res = await api.post('/members/admin/sales/plans', data);
    return res.data;
  },

  auditSalesPlan: async (id: string, data: { action: string; auditedBy: string; auditNotes?: string }) => {
    const res = await api.post(`/members/admin/sales/plans/${id}/audit`, data);
    return res.data;
  },

  // 3. Cashier & Unified Billing
  getMemberDebtSheet: async (personId: string) => {
    const res = await api.get(`/members/admin/cashier/debt/${personId}`);
    return res.data;
  },

  processPayment: async (data: any) => {
    const res = await api.post('/members/admin/cashier/pay', data);
    return res.data;
  },

  getDailyCashClosing: async (date?: string, cashier?: string) => {
    const res = await api.get('/members/admin/cashier/closing', { params: { date, cashier } });
    return res.data;
  },

  // 4. Assemblies
  getAssemblySession: async (title?: string, date?: string) => {
    const res = await api.get('/members/admin/assembly/session', { params: { title, date } });
    return res.data;
  },

  freezeAssemblyCensus: async (sessionId: string) => {
    const res = await api.post('/members/admin/assembly/freeze', { sessionId });
    return res.data;
  },

  registerAssemblyInSitu: async (data: { sessionId: string; personId: string; inSituReceiptNumber?: string }) => {
    const res = await api.post('/members/admin/assembly/in-situ', data);
    return res.data;
  },

  signAssemblyAttendance: async (attendeeId: string, signatureType: string = 'MANUAL') => {
    const res = await api.post(`/members/admin/assembly/sign/${attendeeId}`, { signatureType });
    return res.data;
  },

  // 5. Predictive Alerts
  getDependentAlerts: async () => {
    const res = await api.get('/members/admin/alerts/dependents');
    return res.data;
  },

  getHonoraryCandidates: async () => {
    const res = await api.get('/members/admin/alerts/honorary');
    return res.data;
  },

  promoteToHonorary: async (data: { personId: string; bankDetails?: any }) => {
    const res = await api.post('/members/admin/alerts/promote-honorary', data);
    return res.data;
  },

  // 6. Reports
  getCarteraSaneada: async (category?: string, status?: string, maxDate?: string) => {
    const res = await api.get('/members/admin/reports/cartera-saneada', { params: { category, status, maxDate } });
    return res.data;
  },

  getRevenueSummary: async (year?: number) => {
    const res = await api.get('/members/admin/reports/revenue', { params: { year } });
    return res.data;
  },

  // 7. Settings
  getSettings: async () => {
    const res = await api.get('/members/admin/settings');
    return res.data;
  },

  updateSetting: async (key: string, value: string, numericValue?: number) => {
    const res = await api.put(`/members/admin/settings/${key}`, { value, numericValue });
    return res.data;
  }
};
