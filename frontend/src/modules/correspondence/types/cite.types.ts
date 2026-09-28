export interface OfficialCiteItem {
  id: string;
  citeCode: string;
  year: number;
  areaKey: string;
  areaName: string;
  docType: 'INF' | 'CI' | 'INST' | 'MEM' | 'NE' | string;
  correlative: number;
  recipient: string;
  recipientRole?: string | null;
  recipientEntity?: string | null;
  senderName: string;
  senderRole: string;
  initials?: string | null;
  subject: string;
  bodyText?: string | null;
  status: 'RESERVADO' | 'EMITIDO' | 'RADICADO_HR' | 'ANULADO' | string;
  cancellationReason?: string | null;
  routeSheetId?: string | null;
  routeSheet?: {
    id: string;
    hrCode: string;
    reference: string;
    status: string;
    currentArea?: string;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  officialDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialArea {
  key: string;
  name: string;
  allowedTypes: string[];
  description?: string;
}

export interface OfficialDocType {
  key: 'INF' | 'CI' | 'INST' | 'MEM' | 'NE';
  name: string;
  label: string;
  sigla: string;
  description: string;
}

export interface CiteMetadataResponse {
  areas: OfficialArea[];
  docTypes: OfficialDocType[];
  defaultYear: number;
  userAreaKey?: string;
  userAreaName?: string;
  canAccessAllAreas?: boolean;
  allowedDocTypesForUser?: string[];
}
