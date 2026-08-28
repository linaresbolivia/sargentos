import { api } from '@config/api';

export interface VipPass {
  id: string;
  code: string;
  guestFullName: string;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
  hostSellerName: string;
  validFrom: string;
  validUntil: string;
  maxDays: number;
  timeStart: string;
  timeEnd: string;
  allowedAreas: string;
  status: 'ACTIVO' | 'USADO' | 'EXPIRADO' | 'REVOCADO';
  effectiveStatus?: string;
  isExpired?: boolean;
  usageCount: number;
  maxUses: number;
  lastUsedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVipPassDto {
  guestFullName: string;
  documentId?: string;
  phone?: string;
  email?: string;
  hostSellerName?: string;
  validFrom: string;
  validUntil: string;
  maxDays?: number;
  timeStart?: string;
  timeEnd?: string;
  allowedAreas?: string[] | string;
  maxUses?: number;
  notes?: string;
}

export interface CommercialLead {
  id: string;
  fullName: string;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  position?: string | null;
  categoryInterest: string;
  status: string;
  sponsorMember1?: string | null;
  sponsorMember2?: string | null;
  sellerName?: string | null;
  budgetEstimated?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatePassResponse {
  success: boolean;
  granted: boolean;
  message?: string;
  reason?: string;
  pass?: VipPass;
  guest?: {
    fullName: string;
    documentId?: string;
    hostSellerName: string;
    allowedAreas: string[];
    validUntil: string;
    usageCount: number;
    maxUses: number;
  };
}

export const commercialApi = {
  // VIP Passes
  listPasses: async (status?: string, search?: string) => {
    const res = await api.get<{ success: boolean; data: VipPass[] }>('/commercial/passes', {
      params: { status, search },
    });
    return res.data;
  },

  createPass: async (data: CreateVipPassDto) => {
    const res = await api.post<{ success: boolean; message: string; data: VipPass }>('/commercial/passes', data);
    return res.data;
  },

  getPassById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: VipPass }>(`/commercial/passes/${id}`);
    return res.data;
  },

  validatePass: async (code: string, area: string = 'INGRESO') => {
    const res = await api.post<ValidatePassResponse>('/commercial/passes/validate', { code, area });
    return res.data;
  },

  revokePass: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string; data: VipPass }>(`/commercial/passes/${id}/revoke`);
    return res.data;
  },

  // CRM Leads
  listLeads: async (status?: string) => {
    const res = await api.get<{ success: boolean; data: CommercialLead[] }>('/commercial/leads', {
      params: { status },
    });
    return res.data;
  },

  createLead: async (data: Partial<CommercialLead>) => {
    const res = await api.post<{ success: boolean; message: string; data: CommercialLead }>('/commercial/leads', data);
    return res.data;
  },

  updateLead: async (id: string, data: Partial<CommercialLead>) => {
    const res = await api.patch<{ success: boolean; message: string; data: CommercialLead }>(`/commercial/leads/${id}`, data);
    return res.data;
  },

  deleteLead: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/commercial/leads/${id}`);
    return res.data;
  },

  // Stats
  getStats: async () => {
    const res = await api.get<{ success: boolean; data: any }>('/commercial/stats');
    return res.data;
  },

  // Active Magazine Persistence
  getActiveMagazine: async () => {
    const res = await api.get<{
      success: boolean;
      isCustom: boolean;
      fileName: string | null;
      pages: string[];
      pageAspectRatio: number | null;
    }>('/commercial/magazine');
    return res.data;
  },

  saveActiveMagazine: async (data: { fileName: string; pages: string[]; pageAspectRatio?: number | null }) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>('/commercial/magazine', data);
    return res.data;
  },

  resetActiveMagazine: async () => {
    const res = await api.delete<{ success: boolean; message: string }>('/commercial/magazine');
    return res.data;
  },

  // Video Showcase Persistence Across All Devices
  getCommercialVideos: async () => {
    const res = await api.get<{ success: boolean; videos: any[] }>('/commercial/videos');
    return res.data;
  },

  saveCommercialVideos: async (videos: any[]) => {
    const res = await api.post<{ success: boolean; message: string; videos: any[] }>('/commercial/videos', { videos });
    return res.data;
  },

  uploadCommercialVideoFile: async (file: File, title?: string, onProgress?: (percent: number) => void) => {
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const cleanTitle = encodeURIComponent(title || file.name.replace(/\.[^/.]+$/, ''));

    const res = await api.post<{ success: boolean; message: string; video: any; videos: any[] }>('/commercial/videos/upload', file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-file-extension': ext,
        'x-video-title': cleanTitle
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return res.data;
  },

  // WhatsApp Comercial Direct Dispatch & Status Management
  sendPassWhatsApp: async (passId: string, mediaBase64?: string, customPhone?: string) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>(`/commercial/passes/${passId}/send-whatsapp`, {
      mediaBase64,
      customPhone,
    });
    return res.data;
  },

  getWhatsAppComercialStatus: async () => {
    const res = await api.get<{ success: boolean; data: { status: string; qr: string | null; clientId: string } }>('/whatsapp/chls-comercial/status');
    return res.data;
  },

  startWhatsAppComercialSession: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/whatsapp/chls-comercial/start');
    return res.data;
  },

  logoutWhatsAppComercialSession: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/whatsapp/chls-comercial/logout');
    return res.data;
  },
};
