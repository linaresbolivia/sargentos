export type RouteSheetStatus =
  | 'RECIBIDO'
  | 'DERIVADO'
  | 'EN_PROCESO'
  | 'OBSERVADO'
  | 'SUBSANADO'
  | 'EN_APROBACION'
  | 'CONCLUIDO'
  | 'ANULADO';

export type RouteSheetPriority = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export type RouteSheetSenderType = 'SOCIO' | 'AREA_INTERNA' | 'EXTERNO';

export interface HrMovement {
  id: string;
  routeSheetId: string;
  sequenceNumber: number;
  sourceUserId: string;
  sourceArea: string;
  targetArea: string;
  targetPersonName?: string | null;
  instruction: string;
  quickStamp?: string | null;
  signatureUrl?: string | null;
  durationFormatted?: string;
  durationMs?: number;
  receivedAt?: string | null;
  createdAt: string;
  sourceUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  documents?: CorrDocument[];
}

export interface CorrDocument {
  id: string;
  routeSheetId: string;
  movementId?: string | null;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  sha256Hash?: string | null;
  qrVerificationToken?: string | null;
  createdAt: string;
}

export interface RouteSheetItem {
  id: string;
  hrCode: string;
  year: number;
  correlativeNumber: number;
  senderType: RouteSheetSenderType;
  personId?: string | null;
  senderName: string;
  senderArea?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  senderDoc?: string | null;
  cite?: string | null;
  pageCount: number;
  reference: string;
  attachmentDescription?: string | null;
  priority: RouteSheetPriority;
  status: RouteSheetStatus;
  currentArea: string;
  currentAssigneeId?: string | null;
  aiSummary?: string | null;
  suggestedArea?: string | null;
  archiveLocation?: string | null;
  archiveBox?: string | null;
  archiveNotes?: string | null;
  archivedAt?: string | null;
  archivedById?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  openedAt?: string | null;
  openedByName?: string | null;
  openedByArea?: string | null;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    documentId: string;
    alphaCode?: string | null;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  movements?: HrMovement[];
  documents?: CorrDocument[];
  // SLA Fields
  slaStatus?: 'ON_TIME' | 'WARNING' | 'OVERDUE' | 'COMPLETED';
  slaDeadline?: string;
  slaDaysTotal?: number;
  slaDaysRemaining?: number;
  slaHoursRemaining?: number;
  slaProgressPercent?: number;
  slaLabel?: string;
  isOverdue?: boolean;
}

export interface EcoMetrics {
  totalSheetsSaved: number;
  treesSaved: number;
  waterSavedLiters: number;
  co2SavedKg: number;
}

export interface SlaSummary {
  totalActive: number;
  onTimeCount: number;
  warningCount: number;
  overdueCount: number;
  complianceRate: number;
  areaBreakdown: Array<{
    area: string;
    total: number;
    onTime: number;
    warning: number;
    overdue: number;
  }>;
}

export interface WorkflowNode {
  id: string;
  type: 'DIRECTORIO' | 'GERENCIA' | 'SECRETARIA' | 'LEGAL' | 'FINANZAS' | 'COMPRAS' | 'OPERACIONES' | 'DEPORTES' | 'RECEPCION' | 'ARCHIVO' | 'CONDICIONAL' | 'FUSION';
  title: string;
  subtitle: string;
  manager?: string;
  areaKey?: string;
  x: number;
  y: number;
  slaHours?: number;
  canReceiveExternal?: boolean;
  autoCcArea?: string;
  email?: string;
  phone?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: 'HIERARCHICAL' | 'OPERATIONAL' | 'CONCLUSION' | 'CONDITIONAL';
  conditionText?: string;
}

export interface CorrespondenceWorkflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface CorrespondenceStats {
  total: number;
  recibidos: number;
  derivados: number;
  enProceso: number;
  observados: number;
  concluidos: number;
  areaDistribution: Array<{ name: string; total: number }>;
  ecoMetrics: EcoMetrics;
  slaSummary?: SlaSummary;
  workflow?: CorrespondenceWorkflow;
}
