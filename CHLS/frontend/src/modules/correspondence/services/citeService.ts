import { api } from '@config/api';
import { OfficialCiteItem, OfficialArea, OfficialDocType, CiteMetadataResponse } from '../types/cite.types';

export interface CiteFilters {
  year?: number;
  areaKey?: string;
  docType?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCitePayload {
  areaKey: string;
  docType: string;
  year?: number;
  recipient: string;
  recipientRole?: string;
  recipientEntity?: string;
  senderName: string;
  senderRole: string;
  initials?: string;
  subject: string;
  bodyText?: string;
  status?: 'RESERVADO' | 'EMITIDO' | 'RADICADO_HR';
  routeSheetId?: string;
  officialDate?: string | Date;
}

/**
 * Resuelve cualquier nombre de departamento u organigrama al código oficial de CITE (areaKey)
 */
export function resolveDepartmentToCiteAreaKey(department?: string): string {
  if (!department) return 'GG';
  const norm = department.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (norm.includes('CONTA') || norm.includes('CONTABILIDAD')) return 'JOFRH-CONTA';
  if (norm.includes('MANT') || norm.includes('PISCINA') || norm.includes('TENIS') || norm.includes('POLIGONO') || norm.includes('TIRO')) return 'MANT';
  if (norm.includes('ALMACEN') || norm.includes('SUMINISTROS')) return 'ALM';
  if (norm.includes('ARCHIVO')) return 'ARCH';
  if (norm.includes('SISTEMA') || norm.includes('TECNOLOG') || norm.includes('TI')) return 'SIST';
  if (norm.includes('LEGAL') || norm.includes('ASESOR')) return 'AL';
  if (norm.includes('RRHH') || norm.includes('RECURSOS HUMANOS') || norm.includes('PLANILLA')) return 'JOFRH-RRHH';
  if (norm.includes('COMPRA') || norm.includes('CONTRATA')) return 'JOFRH-CON';
  if (norm.includes('CAJA') || norm.includes('CAJERO')) return 'JOFRH-REC-CC';
  if (norm.includes('RECAUDA') || norm.includes('COBRAN')) return 'JOFRH-REC';
  if (norm.includes('FINANZA') || norm.includes('SUBGERENCIA FIN') || norm.includes('JOFRH') || norm.includes('JOFHR') || norm.includes('OPERACIONES FINANCIERAS')) return 'JOFRH';
  if (norm.includes('HIPIC') || norm.includes('CABALLERIZA') || norm.includes('PISTA') || norm.includes('VETERINAR') || norm.includes('HERRER')) return 'HIP';
  if (norm.includes('SOCIO') || norm.includes('ATS') || norm.includes('RECEPCION') || norm.includes('CASETA') || norm.includes('PORTERIA') || norm.includes('TOALLA')) return 'ATS';
  if (norm.includes('COMUNICACION') || norm.includes('PRENSA') || norm.includes('COMERCIAL')) return 'COM';
  if (norm.includes('DEPORTE') || norm.includes('GIMNASIO')) return 'DEP';
  if (norm.includes('DOCUMENTAL') || norm.includes('GDA')) return 'GDA';
  if (norm.includes('GERENCIA') || norm.includes('DIRECTORIO') || norm.includes('SECRETARIA')) return 'GG';
  return 'GG';
}

export const citeService = {
  async getMetadata(): Promise<CiteMetadataResponse> {
    const res = await api.get('/correspondence/cites/metadata');
    return res.data.data;
  },

  async getPreview(areaKey: string, docType: string, year?: number) {
    const res = await api.get('/correspondence/cites/preview', {
      params: { areaKey, docType, year },
    });
    return res.data.data;
  },

  async getStats(year?: number, areaKey?: string) {
    const res = await api.get('/correspondence/cites/stats', {
      params: { year, areaKey: areaKey && areaKey !== 'ALL' ? areaKey : undefined },
    });
    return res.data.data;
  },

  async listCites(filters: CiteFilters = {}): Promise<{ total: number; data: OfficialCiteItem[] }> {
    const res = await api.get('/correspondence/cites', { params: filters });
    return {
      total: res.data.total,
      data: res.data.data,
    };
  },

  async createCite(payload: CreateCitePayload): Promise<OfficialCiteItem> {
    const res = await api.post('/correspondence/cites', payload);
    return res.data.data;
  },

  async getCiteById(idOrCode: string): Promise<OfficialCiteItem> {
    const res = await api.get(`/correspondence/cites/${encodeURIComponent(idOrCode)}`);
    return res.data.data;
  },

  async downloadCitePdf(idOrCode: string, customFilename?: string): Promise<void> {
    const res = await api.get(`/correspondence/cites/${encodeURIComponent(idOrCode)}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customFilename || `CITE_${idOrCode.replace(/[\/\s°N]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async updateStatus(id: string, status: string, cancellationReason?: string): Promise<OfficialCiteItem> {
    const res = await api.patch(`/correspondence/cites/${id}/status`, {
      status,
      cancellationReason,
    });
    return res.data.data;
  },

  async linkToRouteSheet(id: string, routeSheetId: string): Promise<OfficialCiteItem> {
    const res = await api.post(`/correspondence/cites/${id}/link-routesheet`, {
      routeSheetId,
    });
    return res.data.data;
  },
};
