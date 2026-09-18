import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { RouteSheetItem, CorrDocument } from '../types/correspondence.types';
import {
  Clock,
  Stamp,
  ShieldCheck,
  FileText,
  Copy,
  ArrowRight,
  ExternalLink,
  Paperclip,
  Eye,
  Download,
  X,
  MapPin,
  Calendar,
  Sparkles,
  Compass,
  LayoutList,
  Building2,
  Search,
  Zap,
  Settings,
  User,
  Globe,
  AlertTriangle,
  Target,
  CheckCircle2,
  Leaf,
  Bell,
  FolderArchive,
  UploadCloud,
  ImageIcon,
  FileSpreadsheet,
  BookOpen,
  Loader2,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getDocumentFullUrl } from '../utils/organigramWorkflowService';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { PrintableTimelineReportModal } from './PrintableTimelineReportModal';

interface CorrespondenceTimelineViewProps {
  item: RouteSheetItem;
  onOpenSlaModal: () => void;
  onAddMovement: () => void;
  onPreviewDoc?: (doc: { fileName: string; fileUrl: string; fileType?: string | null }) => void;
  onPrintTimeline?: () => void;
  onPrintSlot?: (slotNumber: number) => void;
}

const formatArea = (raw?: string | null): string => {
  if (!raw) return 'Sin Área';
  const clean = raw.replace(/_/g, ' ').trim();
  return clean
    .toLowerCase()
    .split(' ')
    .map((w) => {
      if (['de', 'del', 'en', 'y', 'a', 'la', 'los', 'las', 'al'].includes(w)) return w;
      if (w === 'rrhh') return 'RR.HH.';
      if (w === 'chls') return 'CHLS';
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
};

const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
};

const formatTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

interface HolographicMilestone {
  id: string;
  stepNumber: number;
  isLeft: boolean;
  dateStr: string;
  timeStr: string;
  fullDate: string;
  badgeLabel: string;
  sourceArea: string;
  targetArea: string;
  personName?: string | null;
  instruction?: string | null;
  quickStamp?: string | null;
  durationFormatted?: string | null;
  signatureUrl?: string | null;
  sourceUserName?: string | null;
  sourceUserId?: string | null;
  receivedAt?: string | null;
  isAccumulated?: boolean;
  documents: CorrDocument[];
  isCurrent: boolean;
  iconType: 'search' | 'zap' | 'settings' | 'user' | 'globe' | 'shield' | 'target';
}

export const CorrespondenceTimelineView: React.FC<CorrespondenceTimelineViewProps> = ({
  item,
  onOpenSlaModal,
  onAddMovement,
  onPreviewDoc,
  onPrintTimeline,
  onPrintSlot,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeView, setActiveView] = useState<'HOLOGRAM' | 'LISTA'>('HOLOGRAM');
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'DIRECT' | 'MINE'>('ALL');
  const [selectedMilestone, setSelectedMilestone] = useState<HolographicMilestone | null>(null);
  const [selectedSignaturePreview, setSelectedSignaturePreview] = useState<string | null>(null);
  const [localPreviewDoc, setLocalPreviewDoc] = useState<{ fileName: string; fileUrl: string; fileType?: string | null } | null>(null);
  const [milestoneDocsPopup, setMilestoneDocsPopup] = useState<CorrDocument[] | null>(null);
  const [showLocalTimelinePrintModal, setShowLocalTimelinePrintModal] = useState(false);
  const [isInitialDocsExpanded, setIsInitialDocsExpanded] = useState(false);

  const [isGeneratingDossier, setIsGeneratingDossier] = useState(false);

  const handleGenerateDossierPdf = async () => {
    try {
      setIsGeneratingDossier(true);
      toast.loading('Compilando expediente y fusionando adjuntos físicos...', { id: 'dossier-load' });

      const response = await api.get(`/correspondence/route-sheets/${item.id}/dossier-pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      toast.success('¡Expediente Completo Unificado generado con éxito!', { id: 'dossier-load' });

      if (onPreviewDoc) {
        onPreviewDoc({
          fileName: `Expediente_Completo_${item.hrCode}.pdf`,
          fileUrl: blobUrl,
          fileType: 'application/pdf',
        });
      } else {
        setLocalPreviewDoc({
          fileName: `Expediente_Completo_${item.hrCode}.pdf`,
          fileUrl: blobUrl,
          fileType: 'application/pdf',
        });
      }
    } catch (err: any) {
      console.error('Error al generar expediente unificado:', err);
      toast.error(err.response?.data?.message || 'Error al compilar el expediente PDF', { id: 'dossier-load' });
    } finally {
      setIsGeneratingDossier(false);
    }
  };

  const handleViewDoc = (doc: { fileName: string; fileUrl: string; mimeType?: string | null }) => {
    if (onPreviewDoc) {
      onPreviewDoc({ fileName: doc.fileName, fileUrl: doc.fileUrl, fileType: doc.mimeType });
    } else {
      setLocalPreviewDoc({ fileName: doc.fileName, fileUrl: doc.fileUrl, fileType: doc.mimeType });
    }
  };

  const movements = item.movements || [];
  const isConcluido = item.status === 'CONCLUIDO';
  const isOverdue = item.isOverdue || item.slaStatus === 'OVERDUE';
  const isWarning = item.slaStatus === 'WARNING';

  // Iconos científicos / HUD correspondientes a cada nivel
  const iconSequence: ('search' | 'zap' | 'settings' | 'user' | 'globe' | 'shield' | 'target')[] = [
    'search',
    'zap',
    'settings',
    'user',
    'globe',
    'shield',
    'target',
  ];

  // 1. Estructurar hitos alternando Izquierda y Derecha de la columna vertebral
  const allMilestones: HolographicMilestone[] = [
    {
      id: 'radicacion-0',
      stepNumber: 0,
      isLeft: true, // Nivel 0 a la izquierda
      dateStr: formatDate(item.createdAt),
      timeStr: formatTime(item.createdAt),
      fullDate: new Date(item.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
      badgeLabel: '🌱 RADICACIÓN (ORIGEN)',
      sourceArea: item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Club' : 'Mesa de Entradas'),
      targetArea: movements[0]?.sourceArea || item.currentArea,
      personName: item.senderName,
      instruction: item.reference,
      quickStamp: item.cite ? `CITE: ${item.cite}` : null,
      documents: (item.documents || []).filter((d) => !d.movementId),
      isCurrent: movements.length === 0,
      iconType: 'search',
      sourceUserName: item.senderName || 'Mesa de Entradas',
      sourceUserId: item.createdById || null,
      isAccumulated: false,
    },
    ...movements.map((mov, idx) => {
      const isCurrentStep = idx === movements.length - 1 && !isConcluido;
      const isLeft = (idx + 1) % 2 === 0; // Alterna: Der, Izq, Der, Izq...
      const icon = iconSequence[(idx + 1) % iconSequence.length];

      const movDocs = (mov.documents && mov.documents.length > 0)
        ? mov.documents
        : (item.documents || []).filter((d) => d.movementId === mov.id);

      const isAccumulated = Boolean(
        mov.instruction?.includes('[EXPEDIENTE ACUMULADO') ||
        mov.instruction?.includes('AUTO DE ACUMULACIÓN') ||
        mov.quickStamp?.includes('ACUMULADO') ||
        mov.quickStamp?.includes('FUSIONADO')
      );

      return {
        id: mov.id,
        stepNumber: mov.sequenceNumber,
        isLeft,
        dateStr: formatDate(mov.createdAt),
        timeStr: formatTime(mov.createdAt),
        fullDate: new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
        badgeLabel: isAccumulated ? '📚 ACUMULADO' : `PASO #${mov.sequenceNumber}`,
        sourceArea: mov.sourceArea,
        targetArea: mov.targetArea,
        personName: mov.targetPersonName || null,
        instruction: mov.instruction,
        quickStamp: mov.quickStamp,
        durationFormatted: mov.durationFormatted,
        signatureUrl: mov.signatureUrl,
        sourceUserName: mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : null,
        sourceUserId: mov.sourceUserId || null,
        receivedAt: mov.receivedAt,
        documents: movDocs,
        isCurrent: isCurrentStep,
        iconType: icon,
        isAccumulated,
      };
    }),
  ];

  // Filtrado de hitos según selección
  const rawFiltered = allMilestones.filter((m) => {
    if (timelineFilter === 'DIRECT') {
      return !m.isAccumulated;
    }
    if (timelineFilter === 'MINE') {
      if (!user) return true;
      const matchesUserId = m.sourceUserId && m.sourceUserId === user.id;
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      const matchesName = Boolean(userFullName && m.sourceUserName && m.sourceUserName.toLowerCase().includes(userFullName));
      return Boolean(matchesUserId || matchesName || (m.stepNumber === 0 && item.senderName?.toLowerCase().includes(userFullName)));
    }
    return true;
  });

  // Re-calcular alternancia isLeft para la vista actual
  const milestones: HolographicMilestone[] = rawFiltered.map((m, idx) => ({
    ...m,
    isLeft: idx % 2 === 0,
  }));

  const N = milestones.length;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'search':
        return <Search className="w-4 h-4 text-[#C5A059]" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-[#C5A059]" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-slate-400" />;
      case 'user':
        return <User className="w-4 h-4 text-slate-400" />;
      case 'globe':
        return <Globe className="w-4 h-4 text-[#C5A059]" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'target':
        return <Target className="w-4 h-4 text-[#C5A059]" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const isFusedChild = Boolean(
    item.archivedAt ||
    (item.status === 'CONCLUIDO' && item.aiSummary?.startsWith('FUSIONADO'))
  );

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/correspondencia?code=${encodeURIComponent(item.hrCode)}`
    : `https://chls.bo/correspondencia?code=${encodeURIComponent(item.hrCode)}`;

  return (
    <div className="space-y-4 text-slate-900 dark:text-white w-full animate-fadeIn">

      {/* ========================================================================= */}
      {/* 0. BANNERS DE ESTADO ESPECIAL: ARCHIVO CENTRAL & FUSIÓN                   */}
      {/* ========================================================================= */}
      {/* Si está archivado: Banner de Ubicación en Archivo Central */}
      {item.archiveLocation && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 shadow-sm animate-fadeIn">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
            <FolderArchive className="w-5 h-5 text-[#C5A059]" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-amber-300 tracking-wider">
                Expediente Resguardado en Archivo Central
              </span>
              {item.archivedAt && (
                <span className="text-[10.5px] font-mono text-slate-400">
                  ({new Date(item.archivedAt).toLocaleDateString('es-BO')})
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-white">
              Ubicación Topográfica: <strong className="text-[#E2C785]">{item.archiveLocation}</strong>
              {item.archiveBox ? ` — ${item.archiveBox}` : ''}
            </p>
            {item.archiveNotes && (
              <p className="text-[11.5px] text-slate-400 italic">
                Auto de Conclusión: "{item.archiveNotes}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Si fue fusionado en otra Hoja de Ruta: Banner de Alerta */}
      {isFusedChild && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <strong className="block font-bold uppercase text-sm">Trámite Acumulado y Fusionado</strong>
            Este expediente y sus antecedentes fueron fusionados formalmente en la Hoja de Ruta principal <strong>{item.currentArea}</strong>.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FICHA TÉCNICA Y METADATOS OFICIALES (REFERENCIA, QR, ORIGEN, RADICADO) */}
      {/* ========================================================================= */}
      {/* Ficha Técnica Unificada y Compacta con Botón de Adjuntos Integrado */}
      {(() => {
        const rawDocs = (item.documents || []).filter((d) => !d.movementId);
        const seenDocKeys = new Set<string>();
        const initialDocs = rawDocs.filter((d) => {
          const key = `${d.fileName}_${d.sha256Hash || d.fileSize || d.fileUrl}`;
          if (seenDocKeys.has(key)) return false;
          seenDocKeys.add(key);
          return true;
        });

        return (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
            {/* Fila Superior: Referencia Principal + Iniciativa Cero Papel + QR de Auditoría */}
            <div className="flex items-start justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-[240px] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Referencia / Asunto
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug uppercase tracking-tight">
                  {item.reference}
                </p>
                {/* Iniciativa Cero Papel y Folios alineado a la izquierda debajo de la Referencia */}
                <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <Leaf className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Iniciativa CHLS Cero Papel — Expediente con Firma Digital y QR</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {item.pageCount || 1} Folio(s)
                  </span>
                </div>
                {item.attachmentDescription && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight pt-0.5">
                    <strong className="text-slate-800 dark:text-slate-300">Adjunto:</strong> {item.attachmentDescription}
                  </p>
                )}
              </div>

              {/* Bloque QR de Verificación & Área Actual Compacto */}
              <div className="flex items-center gap-2.5 shrink-0 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-2xs">
                <div className="p-1 bg-white rounded-lg border border-slate-100 shadow-2xs shrink-0">
                  <QRCodeSVG value={verificationUrl} size={48} level="M" />
                </div>
                <div className="text-left leading-tight">
                  <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 block tracking-wider">
                    Área Actual
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#E2C785] uppercase block truncate max-w-[140px]">
                    {formatArea(item.currentArea)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium block mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Fila Inferior: Metadatos (Remitente, Origen/Empresa, Radicado Por + Botón Mediano de Adjuntos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs">
              {/* 1. Remitente */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
                <User className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block uppercase leading-none mb-0.5">Remitente</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11.5px]">{item.senderName}</span>
                </div>
              </div>

              {/* 2. Origen / Empresa */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block uppercase leading-none mb-0.5">Origen / Empresa</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11.5px]">{item.senderArea || (item.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo')}</span>
                </div>
              </div>

              {/* 3. Radicado Por */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block uppercase leading-none mb-0.5">Radicado Por</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block text-[11.5px]">{item.createdBy?.firstName} {item.createdBy?.lastName || 'Secretaría'}</span>
                </div>
              </div>

              {/* 4. Botón Mediano: Adjuntos de Radicación Inicial */}
              {initialDocs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsInitialDocsExpanded(!isInitialDocsExpanded)}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs group shadow-xs ${
                    isInitialDocsExpanded
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Ver archivos originales digitalizados en la radicación inicial"
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                    <div className="text-left min-w-0 truncate">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block uppercase leading-none mb-0.5 truncate">
                        Adjuntos Origen ({initialDocs.length})
                      </span>
                      <span className="font-bold text-[11.5px] block truncate">
                        {isInitialDocsExpanded ? 'Ocultar Adjuntos' : 'Ver Adjuntos'}
                      </span>
                    </div>
                  </div>
                  {isInitialDocsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#C5A059] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30 px-3 py-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-medium truncate">Sin adjuntos origen</span>
                </div>
              )}
            </div>

            {/* Contenido Desplegado de los Documentos de Radicación Inicial */}
            {isInitialDocsExpanded && initialDocs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fadeIn">
                {initialDocs.map((doc, idx) => {
                  const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType?.includes('pdf');
                  const isImg = doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) || doc.mimeType?.includes('image');
                  const isXls = doc.fileName?.match(/\.(xls|xlsx|csv)$/i) || doc.mimeType?.includes('sheet');

                  return (
                    <div
                      key={doc.id || idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 transition-all hover:border-slate-400 dark:hover:border-slate-700 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isPdf
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : isImg
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                            : isXls
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {isPdf ? (
                            <FileText className="w-4 h-4" />
                          ) : isImg ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : isXls ? (
                            <FileSpreadsheet className="w-4 h-4" />
                          ) : (
                            <Paperclip className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">
                            {doc.fileName}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                              Radicación Inicial
                            </span>
                            {doc.fileSize && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                              </span>
                            )}
                            {doc.sha256Hash && (
                              <span
                                title={`SHA-256: ${doc.sha256Hash}`}
                                className="text-[9px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[130px]"
                              >
                                🛡️ {doc.sha256Hash.substring(0, 10)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones: Ver y Descargar */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewDoc(doc)}
                          title="Visualizar documento en pantalla"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:scale-105"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>

                        <a
                          href={getDocumentFullUrl(doc.fileUrl)}
                          download={doc.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Descargar archivo original a tu equipo"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:scale-105"
                        >
                          <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Descargar</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 2. VISTA "TRAYECTORIA HUD 360°" (DIAGRAMA EJECUTIVO CONECTADO)            */}
      {/* ========================================================================= */}
      {activeView === 'HOLOGRAM' ? (
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden text-slate-100">
          
          {/* Título de Cabecera del Template con Controles Integrados */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80 relative z-10 flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#C5A059]" />
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-200">
                Línea de Trazabilidad 360° • Trayectoria Oficial
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {item.status !== 'CONCLUIDO' && (isOverdue || isWarning) && (
                <button
                  type="button"
                  onClick={onOpenSlaModal}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[10.5px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  title="Notificar vencimiento urgente de SLA"
                >
                  <Bell className="w-3 h-3 text-rose-400" />
                  <span>Alerta SLA</span>
                </button>
              )}

              {/* Selector de Filtro de Proveídos (Todos / Directos / Mis Proveídos) */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 gap-1 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setTimelineFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timelineFilter === 'ALL'
                      ? 'bg-[#C5A059] text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver toda la trazabilidad incluyendo antecedentes acumulados"
                >
                  Todos ({allMilestones.length})
                </button>
                {allMilestones.some(m => m.isAccumulated) && (
                  <button
                    type="button"
                    onClick={() => setTimelineFilter('DIRECT')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      timelineFilter === 'DIRECT'
                        ? 'bg-[#C5A059] text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Ver únicamente los proveídos directos de esta Hoja de Ruta"
                  >
                    Directos ({allMilestones.filter(m => !m.isAccumulated).length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTimelineFilter('MINE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timelineFilter === 'MINE'
                      ? 'bg-[#C5A059] text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver únicamente los proveídos emitidos por mi usuario"
                >
                  Mis Proveídos
                </button>
              </div>

              {/* Selector de Vista: HUD / Lista */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setActiveView('HOLOGRAM')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    (activeView as string) === 'HOLOGRAM'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3 h-3 text-[#C5A059]" />
                  <span>HUD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('LISTA')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    (activeView as string) === 'LISTA'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutList className="w-3 h-3 text-[#C5A059]" />
                  <span>Lista</span>
                </button>
              </div>

              <span className="text-[11px] font-mono font-semibold text-slate-400">
                {N} Hitos • CHLS
              </span>
            </div>
          </div>

          {/* Track Horizontal de Trazabilidad 360° (Ocupa todo el ancho, fluido y responsive) */}
          <div className="overflow-x-auto custom-scrollbar py-4 px-1">
            <div className="flex items-stretch gap-3 sm:gap-4 min-w-full">
              {milestones.map((m, idx) => {
                const isLast = idx === milestones.length - 1;

                return (
                  <React.Fragment key={`h-milestone-${m.id}`}>
                    {/* Tarjeta de Hito Horizontal */}
                    <div
                      onClick={() => setSelectedMilestone(m)}
                      className={`flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer min-w-[300px] sm:min-w-[340px] md:min-w-[360px] flex-1 shrink-0 shadow-lg relative select-none ${
                        m.isCurrent
                          ? 'bg-gradient-to-b from-slate-900 via-[#0e1626] to-slate-950 border-[#C5A059] shadow-[0_4px_25px_rgba(197,160,89,0.2)] ring-2 ring-[#C5A059]/50 hover:scale-[1.01]'
                          : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Badge superior de Custodia Actual si corresponde */}
                      {m.isCurrent && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 rounded-full bg-[#C5A059] text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-[0_0_15px_rgba(197,160,89,0.8)] flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          <span>📍 CUSTODIA ACTUAL</span>
                        </div>
                      )}

                      {/* Header de la Tarjeta: Fecha, Hora y Casilla */}
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80 gap-2">
                        <span className="font-mono text-slate-300 font-medium flex items-center gap-1.5 text-[11px]">
                          <span>📅</span>
                          <span>{m.dateStr}</span>
                          <span className="text-slate-600">•</span>
                          <span>{m.timeStr}</span>
                        </span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.stepNumber > 0 && m.stepNumber <= 8 && onPrintSlot && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrintSlot(m.stepNumber);
                              }}
                              title={`Sobreimprimir en la casilla física N° ${m.stepNumber}`}
                              className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>🖨️ Casilla #{m.stepNumber}</span>
                            </button>
                          )}
                          {!m.isCurrent && (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                              m.isAccumulated
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700/80'
                            }`}>
                              {m.badgeLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Traspaso de Áreas (Origen ➔ Destino) */}
                      <div className="py-2.5 space-y-1">
                        <div className="text-xs sm:text-[13px] font-bold text-white flex items-center gap-2 truncate">
                          <span className="text-slate-200 truncate">{formatArea(m.sourceArea)}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                          <span className="text-[#E2C785] truncate">{formatArea(m.targetArea)}</span>
                        </div>

                        {/* Estado de Recepción */}
                        {m.stepNumber > 0 && (
                          <div className="flex items-center gap-2 pt-0.5">
                            {m.receivedAt ? (
                              <span
                                className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-flex items-center gap-1"
                                title={`Recepcionado en destino el ${formatDate(m.receivedAt)} a las ${formatTime(m.receivedAt)}`}
                              >
                                <span>✓ Recepcionado</span>
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.85)] inline-flex items-center gap-1 animate-pulse"
                                title="Pendiente de recepción física/digital en el área de destino"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>Por Recepcionar</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Proveído / Instrucción */}
                      <div className="text-[11.5px] text-slate-300 leading-relaxed italic my-1.5 bg-black/30 p-2.5 rounded-xl border border-slate-800/60 break-words flex-1">
                        {m.quickStamp && (
                          <span className="font-bold mr-1.5 text-[#C5A059] not-italic uppercase text-[10.5px] block sm:inline">
                            ⚡ {m.quickStamp}
                          </span>
                        )}
                        <span>&quot;{m.instruction || 'Sin notas'}&quot;</span>
                      </div>

                      {/* Footer de la Tarjeta: Adjuntos & Firmante */}
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] gap-2">
                        {m.documents.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDoc(m.documents[0]);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span>{m.documents.length} PDF</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 font-mono text-[10px]">Sin anexos</span>
                        )}

                        <div className="flex items-center gap-1 text-[10.5px] max-w-[200px] truncate" title={`Emitido por: ${m.sourceUserName || formatArea(m.sourceArea) || 'Oficial'}`}>
                          <span className="text-slate-400 font-medium shrink-0">Por:</span>
                          <span className="text-slate-200 font-semibold font-mono truncate">
                            {m.sourceUserName || formatArea(m.sourceArea) || 'Oficial'}
                          </span>
                          {m.personName && (
                            <span className="text-slate-400 text-[10px] truncate font-mono shrink-0" title={`Dirigido a: ${m.personName}`}>
                              ➔ {m.personName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Conector Horizontal entre Hitos */}
                    {!isLast && (
                      <div className="flex flex-col items-center justify-center shrink-0 px-0.5 sm:px-1 select-none">
                        <div className="flex items-center">
                          <div className="w-3 sm:w-6 h-0.5 bg-gradient-to-r from-[#C5A059]/40 to-emerald-500/60" />
                          <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
                            <ArrowRight className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="w-3 sm:w-6 h-0.5 bg-gradient-to-r from-emerald-500/60 to-[#C5A059]/40" />
                        </div>
                        {m.durationFormatted && (
                          <span className="text-[9.5px] font-mono text-slate-400 mt-1.5 uppercase tracking-wider bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                            {m.durationFormatted}
                          </span>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 font-mono mt-1">
            💡 Línea de trazabilidad CHLS. Haz clic en cualquier hito o tarjeta para ver el proveído completo.
          </p>
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. VISTA "LISTA EJECUTIVA"                                               */
        /* ========================================================================= */
        <div className="p-4 sm:p-6 rounded-3xl bg-[#020706] border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] text-white space-y-4">
          {/* Cabecera con controles en Vista Lista */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 relative z-10 flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h4 className="font-black text-xs uppercase tracking-widest text-cyan-300">
                Línea de Trazabilidad 360° • Vista Lista
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {item.status !== 'CONCLUIDO' && (isOverdue || isWarning) && (
                <button
                  type="button"
                  onClick={onOpenSlaModal}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10.5px] font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  title="Notificar vencimiento urgente de SLA"
                >
                  <Bell className="w-3 h-3 text-red-400 animate-pulse" />
                  <span>Alerta SLA</span>
                </button>
              )}

              {/* Selector de Filtro de Proveídos (Todos / Directos / Mis Proveídos) */}
              <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-cyan-500/30 gap-1 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setTimelineFilter('ALL')}
                  className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                    timelineFilter === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver toda la trazabilidad incluyendo antecedentes acumulados"
                >
                  Todos ({allMilestones.length})
                </button>
                {allMilestones.some(m => m.isAccumulated) && (
                  <button
                    type="button"
                    onClick={() => setTimelineFilter('DIRECT')}
                    className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                      timelineFilter === 'DIRECT'
                        ? 'bg-[#C5A059] text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Ver únicamente los proveídos directos de esta Hoja de Ruta"
                  >
                    Directos ({allMilestones.filter(m => !m.isAccumulated).length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTimelineFilter('MINE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timelineFilter === 'MINE'
                      ? 'bg-[#C5A059] text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver únicamente los proveídos emitidos por mi usuario"
                >
                  Mis Proveídos
                </button>
              </div>

              {/* Selector de Vista: HUD / Lista */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setActiveView('HOLOGRAM')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    (activeView as string) === 'HOLOGRAM'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3 h-3 text-[#C5A059]" />
                  <span>HUD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('LISTA')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    (activeView as string) === 'LISTA'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutList className="w-3 h-3 text-[#C5A059]" />
                  <span>Lista</span>
                </button>
              </div>

              <span className="text-[11px] font-mono font-semibold text-slate-400">
                {milestones.length} Hitos • CHLS
              </span>
            </div>
          </div>

          <div className="relative pl-7 sm:pl-9 space-y-4 before:absolute before:left-3 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {[...milestones].reverse().map((m) => (
            <div key={m.id} className="relative">
              <div
                className={`absolute -left-7 sm:-left-9 top-1 w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shadow-xs ${
                  m.isCurrent
                    ? 'bg-[#C5A059] text-slate-950 ring-2 ring-[#C5A059]/30'
                    : 'bg-slate-800 border border-slate-700 text-slate-300'
                }`}
              >
                {m.stepNumber === 0 ? '🌱' : m.stepNumber}
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                m.isCurrent
                  ? 'bg-slate-900/95 border-[#C5A059] shadow-[0_4px_20px_rgba(197,160,89,0.15)] ring-1 ring-[#C5A059]/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              } space-y-2 text-xs shadow-xs text-white`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap font-bold">
                    <span className="text-white">{formatArea(m.sourceArea)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-[#E2C785]">{formatArea(m.targetArea)}</span>
                    <span className="text-slate-400 font-normal text-[11px]">
                      (Emitido por: <strong className="text-slate-200 font-mono">{m.sourceUserName || formatArea(m.sourceArea)}</strong>{m.personName ? ` ➔ Para: ${m.personName}` : ''})
                    </span>
                    {m.stepNumber > 0 && m.stepNumber <= 8 && onPrintSlot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrintSlot(m.stepNumber);
                        }}
                        title={`Sobreimprimir en la casilla física N° ${m.stepNumber} (${m.stepNumber <= 4 ? 'Anverso' : 'Reverso'})`}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-emerald-400" />
                        <span>🖨️ Casilla #{m.stepNumber} ({m.stepNumber <= 4 ? 'Anverso' : 'Reverso'})</span>
                      </button>
                    )}
                    {m.stepNumber > 0 && (
                      m.receivedAt ? (
                        <span
                          className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-bold flex items-center gap-1"
                          title={`Recepcionado el ${formatDate(m.receivedAt)} a las ${formatTime(m.receivedAt)}`}
                        >
                          ✓ Recepcionado {formatDate(m.receivedAt)} {formatTime(m.receivedAt)}
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9.5px] font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.85)] animate-pulse"
                          title="Pendiente de recepción física y digital en destino"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>Por Recepcionar</span>
                        </span>
                      )
                    )}
                    {m.isAccumulated && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9.5px] font-bold">
                        📚 EXPEDIENTE ACUMULADO
                      </span>
                    )}
                    {m.isCurrent && (
                      <span className="px-1.5 py-0.2 rounded bg-[#C5A059] text-slate-950 text-[9px] font-bold">
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {m.fullDate} • {m.timeStr}
                  </span>
                </div>

                {m.quickStamp && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-[#C5A059] border border-slate-700">
                    <Stamp className="w-3 h-3 text-[#C5A059]" />
                    <span>{m.quickStamp}</span>
                  </span>
                )}

                <p className="text-slate-300 pl-3 border-l-2 border-[#C5A059]/40 italic">
                  &quot;{m.instruction}&quot;
                </p>

                {m.documents.length > 0 && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-slate-800">
                    {m.documents.map((doc, di) => (
                      <div key={doc.id || di} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                        <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span className="font-bold truncate max-w-[160px]">{doc.fileName}</span>
                        <button
                          type="button"
                          onClick={() => handleViewDoc(doc)}
                          className="text-[10.5px] font-bold text-[#C5A059] hover:underline cursor-pointer ml-1"
                        >
                          Ver
                        </button>
                        <a
                          href={getDocumentFullUrl(doc.fileUrl)}
                          download={doc.fileName}
                          className="text-[10.5px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          ⬇
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* 4. MODAL DETALLE EXPANDIDO AL TOCAR CUALQUIER RADAR                        */}
      {/* ========================================================================= */}
      {selectedMilestone && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedMilestone(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Hito */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C5A059] text-slate-950 font-bold text-xs flex items-center justify-center shadow-xs">
                  {selectedMilestone.stepNumber === 0 ? '🌱' : `#${selectedMilestone.stepNumber}`}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white uppercase">
                    {selectedMilestone.badgeLabel}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedMilestone.fullDate} • {selectedMilestone.timeStr}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Traspaso */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Origen:</span>
                <span className="font-bold text-white">{formatArea(selectedMilestone.sourceArea)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Destino:</span>
                <span className="font-bold text-[#E2C785]">{formatArea(selectedMilestone.targetArea)}</span>
              </div>
            </div>

            {selectedMilestone.stepNumber > 0 && (
              <div className={`px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-between border ${
                selectedMilestone.receivedAt
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border-red-500/40 text-red-300'
              }`}>
                <span className="font-semibold flex items-center gap-1.5">
                  {selectedMilestone.receivedAt ? '✓ Estado de Recepción:' : '🔴 Estado de Recepción:'}
                </span>
                <span className="font-bold font-mono">
                  {selectedMilestone.receivedAt
                    ? `Recepcionado el ${formatDate(selectedMilestone.receivedAt)} a las ${formatTime(selectedMilestone.receivedAt)}`
                    : 'Pendiente de recepción física/digital en destino'}
                </span>
              </div>
            )}

            {/* Sello & Instrucción */}
            <div className="space-y-1 text-xs">
              {selectedMilestone.quickStamp && (
                <div className="text-[#C5A059] font-bold uppercase text-[11px] mb-1">
                  ⚡ {selectedMilestone.quickStamp}
                </div>
              )}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                &quot;{selectedMilestone.instruction}&quot;
              </div>
            </div>

            {/* Documentos Adjuntos */}
            {selectedMilestone.documents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <span className="font-bold text-[#C5A059] flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Archivos Adjuntos ({selectedMilestone.documents.length}):</span>
                </span>
                <div className="space-y-2">
                  {selectedMilestone.documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-[#C5A059] shrink-0" />
                        <span className="font-bold text-xs truncate">{doc.fileName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMilestone(null);
                            handleViewDoc(doc);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 font-bold text-xs cursor-pointer"
                        >
                          Ver
                        </button>
                        <a
                          href={getDocumentFullUrl(doc.fileUrl)}
                          download={doc.fileName}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                        >
                          Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer con el botón solicitado de Archivos Adjuntos */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-slate-400 flex-wrap gap-2">
              <span className="truncate max-w-[200px]">
                Emitido por: <strong className="text-white">{selectedMilestone.sourceUserName || 'Oficial'}</strong>
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {/* BOTÓN SOBREIMPRIMIR CASILLA EN PAPEL FÍSICO */}
                {selectedMilestone.stepNumber > 0 && selectedMilestone.stepNumber <= 8 && onPrintSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      onPrintSlot(selectedMilestone.stepNumber);
                      setSelectedMilestone(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all hover:scale-105"
                    title={`Sobreimprimir únicamente este proveído en la Casilla N° ${selectedMilestone.stepNumber} (${selectedMilestone.stepNumber <= 4 ? 'Anverso' : 'Reverso'}) de la hoja física`}
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-300" />
                    <span>🖨️ Sobreimprimir en Casilla N° {selectedMilestone.stepNumber}</span>
                  </button>
                )}

                {selectedMilestone.signatureUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSignaturePreview(selectedMilestone.signatureUrl || null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer font-bold text-xs transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Firma</span>
                  </button>
                )}

                {/* BOTÓN SOLICITADO: VER ARCHIVOS ADJUNTOS QUE MANDARON */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMilestone.documents.length === 1) {
                      handleViewDoc(selectedMilestone.documents[0]);
                    } else if (selectedMilestone.documents.length > 1) {
                      setMilestoneDocsPopup(selectedMilestone.documents);
                    } else if (item.documents && item.documents.length > 0) {
                      setMilestoneDocsPopup(item.documents);
                    } else {
                      setMilestoneDocsPopup([]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    selectedMilestone.documents.length > 0
                      ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                      : (item.documents && item.documents.length > 0)
                      ? 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 hover:scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-slate-400 border border-white/10'
                  }`}
                  title="Ver archivos adjuntos de este paso"
                >
                  <Paperclip className="w-3.5 h-3.5 text-cyan-300" />
                  <span>
                    {selectedMilestone.documents.length > 0
                      ? `Ver Adjuntos (${selectedMilestone.documents.length})`
                      : (item.documents && item.documents.length > 0)
                      ? `Ver Adjuntos (${item.documents.length})`
                      : 'Ver Adjuntos (0)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Archivos Adjuntos del Proveído / Hito */}
      {milestoneDocsPopup && (
        <div
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setMilestoneDocsPopup(null)}
        >
          <div
            className="bg-[#03140e] border-2 border-cyan-500/50 rounded-3xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.3)] space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                <h4 className="font-black text-sm uppercase">
                  Archivos Adjuntos ({milestoneDocsPopup.length})
                </h4>
              </div>
              <button
                onClick={() => setMilestoneDocsPopup(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {milestoneDocsPopup.length > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
                {milestoneDocsPopup.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="font-bold text-xs truncate text-slate-200">{doc.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setMilestoneDocsPopup(null);
                          setSelectedMilestone(null);
                          handleViewDoc(doc);
                        }}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Ver
                      </button>
                      <a
                        href={getDocumentFullUrl(doc.fileUrl)}
                        download={doc.fileName}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        ⬇
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                <Paperclip className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-slate-300">No se registraron archivos adjuntos en este proveído.</p>
                <p className="text-[11px] text-slate-500 mt-1">Los proveídos pueden tramitarse solo con instrucción o con documentos digitalizados.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMilestoneDocsPopup(null)}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Signature Preview Modal */}
      {selectedSignaturePreview && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedSignaturePreview(null)}
        >
          <div
            className="bg-[#03140e] border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h4 className="font-black text-xs uppercase">Firma Digital Registrada</h4>
              </div>
              <button
                onClick={() => setSelectedSignaturePreview(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center">
              <img
                src={selectedSignaturePreview}
                alt="Firma Digital"
                className="max-h-40 object-contain"
              />
            </div>

            <button
              onClick={() => setSelectedSignaturePreview(null)}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Visor de Documentos Digitalizados */}
      {localPreviewDoc && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#03140e] border border-cyan-500/40 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
            <div className="p-4 bg-slate-900 flex items-center justify-between gap-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-black text-sm truncate">{localPreviewDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getDocumentFullUrl(localPreviewDoc.fileUrl)}
                  download={localPreviewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:opacity-90 text-white text-xs font-black hover:scale-105 transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar</span>
                </a>
                <a
                  href={getDocumentFullUrl(localPreviewDoc.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Abrir en pestaña completa"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLocalPreviewDoc(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500 text-white transition-colors cursor-pointer"
                  title="Cerrar visor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black/90 p-2 sm:p-4 overflow-auto flex items-center justify-center">
              {localPreviewDoc.fileName.toLowerCase().endsWith('.pdf') || localPreviewDoc.fileType === 'application/pdf' ? (
                <iframe
                  src={getDocumentFullUrl(localPreviewDoc.fileUrl)}
                  title={localPreviewDoc.fileName}
                  className="w-full h-full rounded-2xl border border-white/10 bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-slate-900 rounded-2xl border border-white/10 max-w-md">
                  <Paperclip className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  <h4 className="text-sm font-black text-white mb-1">{localPreviewDoc.fileName}</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Este archivo se puede descargar directamente a su equipo.
                  </p>
                  <a
                    href={getDocumentFullUrl(localPreviewDoc.fileUrl)}
                    download={localPreviewDoc.fileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Archivo Ahora</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Local de Impresión de Trazabilidad 360° */}
      {showLocalTimelinePrintModal && (
        <PrintableTimelineReportModal
          isOpen={showLocalTimelinePrintModal}
          onClose={() => setShowLocalTimelinePrintModal(false)}
          item={item}
        />
      )}

    </div>
  );
};

export default CorrespondenceTimelineView;
