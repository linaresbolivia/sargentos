import React, { useState } from 'react';
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
}) => {
  const [activeView, setActiveView] = useState<'HOLOGRAM' | 'LISTA'>('HOLOGRAM');
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
  const milestones: HolographicMilestone[] = [
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
    },
    ...movements.map((mov, idx) => {
      const isCurrentStep = idx === movements.length - 1 && !isConcluido;
      const isLeft = (idx + 1) % 2 === 0; // Alterna: Der, Izq, Der, Izq...
      const icon = iconSequence[(idx + 1) % iconSequence.length];

      const movDocs = (mov.documents && mov.documents.length > 0)
        ? mov.documents
        : (item.documents || []).filter((d) => d.movementId === mov.id);

      return {
        id: mov.id,
        stepNumber: mov.sequenceNumber,
        isLeft,
        dateStr: formatDate(mov.createdAt),
        timeStr: formatTime(mov.createdAt),
        fullDate: new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
        badgeLabel: `PASO #${mov.sequenceNumber}`,
        sourceArea: mov.sourceArea,
        targetArea: mov.targetArea,
        personName: mov.targetPersonName || null,
        instruction: mov.instruction,
        quickStamp: mov.quickStamp,
        durationFormatted: mov.durationFormatted,
        signatureUrl: mov.signatureUrl,
        sourceUserName: mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : null,
        documents: movDocs,
        isCurrent: isCurrentStep,
        iconType: icon,
      };
    }),
  ];

  // 2. Geometría SVG Amplia y Espaciosa para el Diagrama Holográfico Vertical
  const N = milestones.length;
  const ROW_H = 220; // Espacio vertical amplio para textos completos de proveídos
  const START_Y = 60;
  const TOTAL_W = 1260; // Ancho ampliado para alta legibilidad ejecutiva
  const CENTER_X = 630; // Columna central espaciosa
  const TOTAL_H = START_Y + N * ROW_H + 140;
  const DOCK_Y = TOTAL_H - 50;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'search':
        return <Search className="w-4 h-4 text-cyan-400" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-cyan-400" />;
      case 'user':
        return <User className="w-4 h-4 text-emerald-400" />;
      case 'globe':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'target':
        return <Target className="w-4 h-4 text-cyan-400" />;
      default:
        return <FileText className="w-4 h-4 text-cyan-400" />;
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
    <div className="space-y-4 text-slate-900 dark:text-white max-w-6xl mx-auto animate-fadeIn">

      {/* ========================================================================= */}
      {/* 0. BANNERS DE ESTADO ESPECIAL: ARCHIVO CENTRAL & FUSIÓN                   */}
      {/* ========================================================================= */}
      {/* Si está archivado: Banner de Ubicación en Archivo Central */}
      {item.archiveLocation && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border-2 border-emerald-500/40 flex items-start gap-3.5 shadow-md animate-fadeIn">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 mt-0.5">
            <FolderArchive className="w-5 h-5 text-brand-gold" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                Expediente Resguardado en Archivo Central
              </span>
              {item.archivedAt && (
                <span className="text-[10.5px] font-mono text-slate-400">
                  ({new Date(item.archivedAt).toLocaleDateString('es-BO')})
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-white">
              Ubicación Topográfica: <strong className="text-brand-gold">{item.archiveLocation}</strong>
              {item.archiveBox ? ` — ${item.archiveBox}` : ''}
            </p>
            {item.archiveNotes && (
              <p className="text-[11.5px] text-slate-300 italic">
                Auto de Conclusión: "{item.archiveNotes}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Si fue fusionado en otra Hoja de Ruta: Banner de Alerta */}
      {isFusedChild && (
        <div className="flex items-center gap-3 bg-amber-500/15 border-2 border-amber-500/40 rounded-3xl p-4 text-amber-300">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="text-xs">
            <strong className="block font-black uppercase text-sm">Trámite Acumulado y Fusionado</strong>
            Este expediente y sus antecedentes fueron fusionados formalmente en la Hoja de Ruta principal <strong>{item.currentArea}</strong>.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FICHA TÉCNICA Y METADATOS OFICIALES (REFERENCIA, QR, ORIGEN, RADICADO) */}
      {/* ========================================================================= */}
      {/* Iniciativa Cero Papel Banner */}
      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 px-5 text-xs text-emerald-400">
        <div className="flex items-center gap-2 font-bold">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <span>Iniciativa CHLS Cero Papel — Expediente Oficial con Firma Digital y Validador QR</span>
        </div>
        <span className="font-mono font-black text-emerald-300">
          {item.pageCount || 1} Folio(s)
        </span>
      </div>

      {/* Tarjeta Principal de Referencia y QR de Validación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/90 dark:bg-[#071510] p-5 rounded-2xl border border-slate-200/90 dark:border-emerald-500/30 shadow-md">
        <div className="space-y-1.5 md:col-span-2">
          <span className="text-[10px] font-black text-slate-500 dark:text-emerald-400/80 uppercase tracking-wider">
            Referencia / Asunto
          </span>
          <p className="text-sm sm:text-base font-black text-slate-950 dark:text-white leading-relaxed uppercase">
            {item.reference}
          </p>
          {item.attachmentDescription && (
            <p className="text-xs text-slate-700 dark:text-gray-400 mt-2">
              <strong className="text-slate-950 dark:text-gray-200 font-bold">Adjunto:</strong> {item.attachmentDescription}
            </p>
          )}
        </div>

        {/* QR Verification Card */}
        <div className="flex items-center justify-end gap-3.5 border-t md:border-t-0 md:border-l border-slate-200 dark:border-emerald-500/20 pt-3 md:pt-0 md:pl-5">
          <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-sm shrink-0">
            <QRCodeSVG value={verificationUrl} size={64} level="M" />
          </div>
          <div className="text-left space-y-0.5">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
              Área Actual
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-brand-gold uppercase block">
              {formatArea(item.currentArea)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold block">
              {new Date(item.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Remitente, Origen y Radicado Por */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#071510] border border-slate-200/90 dark:border-emerald-500/20">
          <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black block mb-0.5">Remitente</span>
          <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-brand-gold shrink-0" />
            <span className="truncate">{item.senderName}</span>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#071510] border border-slate-200/90 dark:border-emerald-500/20">
          <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black block mb-0.5">Origen / Empresa</span>
          <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{item.senderArea || (item.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo')}</span>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#071510] border border-slate-200/90 dark:border-emerald-500/20">
          <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black block mb-0.5">Radicado Por</span>
          <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{item.createdBy?.firstName} {item.createdBy?.lastName || 'Secretaría'}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DOCUMENTO BASE DE RADICACIÓN INICIAL (ORIGEN)                          */}
      {/* ========================================================================= */}
      {(() => {
        const rawDocs = (item.documents || []).filter((d) => !d.movementId);
        const seenDocKeys = new Set<string>();
        const initialDocs = rawDocs.filter((d) => {
          const key = `${d.fileName}_${d.sha256Hash || d.fileSize || d.fileUrl}`;
          if (seenDocKeys.has(key)) return false;
          seenDocKeys.add(key);
          return true;
        });

        if (initialDocs.length === 0) return null;

        return (
          <div className="bg-[#040e0b] border-2 border-emerald-500/30 rounded-3xl p-3.5 sm:p-4 transition-all shadow-[0_0_25px_rgba(16,185,129,0.1)]">
            {/* Botón Barra Desplegable */}
            <button
              type="button"
              onClick={() => setIsInitialDocsExpanded(!isInitialDocsExpanded)}
              className="w-full flex items-center justify-between flex-wrap gap-2 text-left cursor-pointer group focus:outline-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-colors">
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 flex-wrap">
                    <span className="group-hover:text-emerald-300 transition-colors">
                      Documento Base de Radicación Inicial ({initialDocs.length})
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Ingreso Oficial
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isInitialDocsExpanded
                      ? 'Documentos formales incorporados al radicar el trámite original'
                      : `Haz clic para desplegar y ver los ${initialDocs.length} archivo(s) digitalizado(s)`}
                  </p>
                </div>
              </div>

              {/* Botón Badge de Despliegue */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30 group-hover:bg-emerald-500/25 flex items-center gap-1.5 transition-all shadow-xs">
                  <span>{isInitialDocsExpanded ? 'Ocultar Adjuntos' : 'Desplegar Adjuntos'}</span>
                  {isInitialDocsExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </span>
              </div>
            </button>

            {/* Contenido Desplegado */}
            {isInitialDocsExpanded && (
              <div className="mt-3.5 pt-3.5 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                {initialDocs.map((doc, idx) => {
                  const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType?.includes('pdf');
                  const isImg = doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) || doc.mimeType?.includes('image');
                  const isXls = doc.fileName?.match(/\.(xls|xlsx|csv)$/i) || doc.mimeType?.includes('sheet');

                  return (
                    <div
                      key={doc.id || idx}
                      className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/30 flex items-center justify-between gap-3 transition-all hover:border-emerald-500 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isPdf
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : isImg
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : isXls
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {isPdf ? (
                            <FileText className="w-5 h-5" />
                          ) : isImg ? (
                            <ImageIcon className="w-5 h-5" />
                          ) : isXls ? (
                            <FileSpreadsheet className="w-5 h-5" />
                          ) : (
                            <Paperclip className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-white truncate block">
                            {doc.fileName}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                              Radicación Inicial
                            </span>
                            {doc.fileSize && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                              </span>
                            )}
                            {doc.sha256Hash && (
                              <span
                                title={`SHA-256: ${doc.sha256Hash}`}
                                className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 truncate max-w-[130px]"
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-105"
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-brand-gold/20 text-gray-200 hover:text-brand-gold border border-white/10 text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-105"
                        >
                          <Download className="w-3.5 h-3.5" />
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
      {/* 1. BARRA SUPERIOR MINIMALISTA DE CUSTODIA Y SLA                          */}
      {/* ========================================================================= */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-[#040e0b] border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex items-center justify-between flex-wrap gap-3">
        
        {/* Custodia y SLA (Indicadores en texto de color) */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Custodia Actual:</span>
            <span className="text-cyan-300 font-black flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{formatArea(item.currentArea)}</span>
            </span>
          </div>

          <span className="text-slate-600 font-bold">•</span>

          <span className={`font-black flex items-center gap-1 ${
            isOverdue
              ? 'text-rose-400'
              : isWarning
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{item.slaLabel || (isOverdue ? 'SLA Vencido' : 'En Plazo')}</span>
          </span>

          <span className="text-slate-600 font-bold">•</span>

          <span className="text-slate-400 font-semibold">
            Prioridad: <strong className="text-white uppercase font-black">{item.priority}</strong>
          </span>
        </div>

        {/* Acciones y Selector de Vista */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {item.status !== 'CONCLUIDO' && (
            <button
              type="button"
              onClick={onOpenSlaModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              title="Notificar vencimiento urgente de SLA"
            >
              <Bell className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>Alertar SLA</span>
            </button>
          )}

          {!isConcluido && (
            <button
              type="button"
              onClick={onAddMovement}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-xs hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              <span>+ Derivar / Proveído</span>
            </button>
          )}

          {/* Botón: Imprimir Timeline en Tabla o Lista con Logo CHLS */}
          <button
            type="button"
            onClick={onPrintTimeline || (() => setShowLocalTimelinePrintModal(true))}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-300 font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/50 cursor-pointer"
            title="Imprimir el timeline de trazabilidad en una elegante tabla o lista con el logotipo oficial del Club Hípico Los Sargentos"
          >
            <Printer className="w-3.5 h-3.5 text-brand-gold" />
            <span>🖨️ Imprimir Timeline (PDF)</span>
          </button>

          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveView('HOLOGRAM')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'HOLOGRAM'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Holograma HUD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('LISTA')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'LISTA'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VISTA "HOLOGRAMA HUD" (EXACTA AL TEMPLATE INFOGRÁFICO SCI-FI)          */}
      {/* ========================================================================= */}
      {activeView === 'HOLOGRAM' ? (
        <div className="p-4 sm:p-6 rounded-3xl bg-[#020706] border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden text-white">
          
          {/* Título de Cabecera del Template */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h4 className="font-black text-xs uppercase tracking-widest text-cyan-300">
                Línea de Trazabilidad 360° • Estructura Holográfica
              </h4>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {N} Hitos en Cadena • CHLS
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar pt-4 pb-2">
            <svg
              viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
              className="min-w-[880px] w-full h-auto overflow-visible select-none"
            >
              <defs>
                {/* Resplandor Cian Neón */}
                <filter id="hud-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Gradiente del Haz de Luz Holográfico en la Base */}
                <linearGradient id="holo-beam-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="30%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>

                {/* Gradiente de la Columna Vertebral */}
                <linearGradient id="spine-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* ========================================================================= */}
              {/* 1. PEDESTAL HOLOGRÁFICO EN LA BASE (TABLETA / PROYECTOR DE LUZ)          */}
              {/* ========================================================================= */}
              <g transform={`translate(${CENTER_X}, ${DOCK_Y})`}>
                {/* Haz de luz cónico ascendente */}
                <polygon
                  points="-170,20 170,20 0,-180"
                  fill="url(#holo-beam-grad)"
                  opacity="0.45"
                />

                {/* Sombra de la tableta */}
                <ellipse cx="0" cy="22" rx="180" ry="25" fill="#000000" opacity="0.8" filter="blur(6px)" />

                {/* Cuerpo de la tableta / base */}
                <path
                  d="M -170 15 L -120 -8 L 120 -8 L 170 15 L 160 25 L -160 25 Z"
                  fill="#0c1714"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />

                {/* Pantalla luminosa central */}
                <ellipse cx="0" cy="8" rx="115" ry="12" fill="#06b6d4" opacity="0.3" filter="url(#hud-glow)" />
                <ellipse cx="0" cy="8" rx="60" ry="6" fill="#10b981" opacity="0.6" />
                <circle cx="0" cy="8" r="5" fill="#ffffff" filter="url(#hud-glow)" />
              </g>

              {/* ========================================================================= */}
              {/* 2. COLUMNA VERTEBRAL CENTRAL (LÍNEA DE DATOS NEÓN DE ALTA VISIBILIDAD)   */}
              {/* ========================================================================= */}
              {/* Resplandor exterior de la línea central */}
              <line
                x1={CENTER_X}
                y1={START_Y - 25}
                x2={CENTER_X}
                y2={DOCK_Y}
                stroke="#06b6d4"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.35"
              />

              {/* Trazo principal cian neón de la columna central */}
              <line
                x1={CENTER_X}
                y1={START_Y - 25}
                x2={CENTER_X}
                y2={DOCK_Y}
                stroke="#22d3ee"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Filo blanco luminoso central */}
              <line
                x1={CENTER_X}
                y1={START_Y - 25}
                x2={CENTER_X}
                y2={DOCK_Y}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* Remate superior de la columna con pulso de luz */}
              <circle cx={CENTER_X} cy={START_Y - 25} r="7" fill="#06b6d4" opacity="0.5" />
              <circle cx={CENTER_X} cy={START_Y - 25} r="4" fill="#22d3ee" />
              <circle cx={CENTER_X} cy={START_Y - 25} r="2" fill="#ffffff" />

              {/* ========================================================================= */}
              {/* 3. NIVELES ALTERNADOS (NACEN ABAJO Y EL ÚLTIMO PROCESADO ESTÁ ARRIBA)    */}
              {/* ========================================================================= */}
              {milestones.map((m, idx) => {
                // Nacen abajo (idx 0 en la base) y el último procesado arriba (idx N - 1 en START_Y)
                const levelFromTop = N - 1 - idx;
                const y = START_Y + levelFromTop * ROW_H;
                const isLeft = m.isLeft;
                const ringColor = m.isCurrent ? '#10b981' : (idx % 2 === 0 ? '#06b6d4' : '#10b981');

                // Dimensiones Amplias de la Tarjeta (460px de ancho y 165px de alto)
                const CARD_W = 460;
                const CARD_H = 165;
                const cardY = y;

                // Posición de los anillos orbitales HUD y Tarjetas Flotantes
                const ringX = isLeft ? 50 : 1210;
                const ringY = y + CARD_H / 2;
                const cardX = isLeft ? 115 : 685;

                return (
                  <g key={`hologram-level-${m.id}`}>
                    {/* =================================================================== */}
                    {/* A. LÍNEAS DE BRACKET / CIRCUITO HUD (CONECTORES A 90°)              */}
                    {/* =================================================================== */}
                    {isLeft ? (
                      // Rama hacia la IZQUIERDA
                      <g stroke={ringColor} strokeWidth="2.5" fill="none">
                        {/* Nodo de unión luminoso en la columna central */}
                        <circle cx={CENTER_X} cy={ringY} r="6" fill={ringColor} stroke="none" />
                        <circle cx={CENTER_X} cy={ringY} r="2.5" fill="#ffffff" stroke="none" />

                        {/* Línea horizontal desde el centro hacia la tarjeta */}
                        <line x1={CENTER_X} y1={ringY} x2={cardX + CARD_W} y2={ringY} />

                        {/* Línea horizontal desde la tarjeta hacia el radar orbital */}
                        <line x1={cardX} y1={ringY} x2={ringX + 38} y2={ringY} />

                        {/* Bracket angular decorativo envolvente */}
                        <path
                          d={`M ${cardX + CARD_W} ${cardY + 8} L ${cardX + CARD_W + 8} ${cardY + 8} L ${cardX + CARD_W + 8} ${cardY + CARD_H - 8} L ${cardX + CARD_W} ${cardY + CARD_H - 8}`}
                          opacity="0.8"
                        />
                      </g>
                    ) : (
                      // Rama hacia la DERECHA
                      <g stroke={ringColor} strokeWidth="2.5" fill="none">
                        {/* Nodo de unión luminoso en la columna central */}
                        <circle cx={CENTER_X} cy={ringY} r="6" fill={ringColor} stroke="none" />
                        <circle cx={CENTER_X} cy={ringY} r="2.5" fill="#ffffff" stroke="none" />

                        {/* Línea horizontal desde el centro hacia la tarjeta */}
                        <line x1={CENTER_X} y1={ringY} x2={cardX} y2={ringY} />

                        {/* Línea horizontal desde la tarjeta hacia el radar orbital */}
                        <line x1={cardX + CARD_W} y1={ringY} x2={ringX - 38} y2={ringY} />

                        {/* Bracket angular decorativo envolvente */}
                        <path
                          d={`M ${cardX} ${cardY + 8} L ${cardX - 8} ${cardY + 8} L ${cardX - 8} ${cardY + CARD_H - 8} L ${cardX} ${cardY + CARD_H - 8}`}
                          opacity="0.8"
                        />
                      </g>
                    )}

                    {/* =================================================================== */}
                    {/* B. ANILLOS ORBITALES HUD (RADAR TARGET EXACTO A LA IMAGEN)          */}
                    {/* =================================================================== */}
                    <g
                      transform={`translate(${ringX}, ${ringY})`}
                      className="cursor-pointer hover:scale-115 transition-transform"
                      onClick={() => setSelectedMilestone(m)}
                    >
                      {/* Anillo exterior segmentado (arco 1) */}
                      <circle
                        cx="0"
                        cy="0"
                        r="34"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="1.5"
                        strokeDasharray="36 16 24 12"
                        opacity="0.65"
                      />

                      {/* Anillo intermedio segmentado (arco 2) */}
                      <circle
                        cx="0"
                        cy="0"
                        r="26"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="1.5"
                        strokeDasharray="22 10 32 8"
                        opacity="0.8"
                      />

                      {/* Onda de radar en pulso continuo si es la Custodia Actual */}
                      {m.isCurrent && (
                        <circle
                          cx="0"
                          cy="0"
                          r="42"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          className="animate-ping opacity-75"
                        />
                      )}

                      {/* Núcleo central oscuro con borde luminoso y punto de luz */}
                      <circle
                        cx="0"
                        cy="0"
                        r="18"
                        fill="#03140e"
                        stroke={ringColor}
                        strokeWidth="2"
                        filter="url(#hud-glow)"
                      />
                      <circle cx="0" cy="0" r="6" fill={ringColor} />
                      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                    </g>

                    {/* =================================================================== */}
                    {/* C. TARJETA FLOTANTE DE EXPEDIENTE (AMPLIA Y CÓMODA)                */}
                    {/* =================================================================== */}
                    <foreignObject
                      x={cardX}
                      y={cardY}
                      width={CARD_W}
                      height={CARD_H}
                    >
                      <div
                        onClick={() => setSelectedMilestone(m)}
                        className={`w-full h-full flex flex-col justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer shadow-md backdrop-blur-md ${
                          m.isCurrent
                            ? 'bg-[#031c14]/95 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/30 hover:scale-102'
                            : 'bg-[#03130d]/90 border-cyan-500/40 hover:border-cyan-400 hover:scale-102 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        }`}
                      >
                        {/* Fila 1: Fecha, Hora y Badge de Paso */}
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
                          <span className="font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                            <span>📅</span>
                            <span>{m.dateStr}</span>
                            <span className="text-slate-500">•</span>
                            <span>{m.timeStr}</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wide ${
                            m.isCurrent
                              ? 'bg-emerald-500 text-slate-950 shadow-xs'
                              : 'bg-white/10 text-cyan-300'
                          }`}>
                            {m.isCurrent ? '📍 CUSTODIA ACTUAL' : m.badgeLabel}
                          </span>
                        </div>

                        {/* Fila 2: Traspaso de Áreas (Origen ➔ Destino) Sin Recorte */}
                        <div className="text-[12px] sm:text-[13px] font-black text-white flex items-center gap-2 my-0.5">
                          <span className="text-slate-200">{formatArea(m.sourceArea)}</span>
                          <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-emerald-300">{formatArea(m.targetArea)}</span>
                        </div>

                        {/* Fila 3: Proveído completo y sello oficial (sin recorte) */}
                        <div className="text-[11px] text-slate-200 leading-relaxed italic my-1 break-words overflow-y-auto max-h-[85px] custom-scrollbar pr-1">
                          {m.quickStamp && (
                            <span className="font-bold mr-1.5 text-cyan-400 not-italic uppercase text-[10.5px]">
                              ⚡ {m.quickStamp}
                            </span>
                          )}
                          <span>&quot;{m.instruction || 'Sin notas'}&quot;</span>
                        </div>

                        {/* Fila 4: Adjuntos PDF y Responsable */}
                        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                          {m.documents.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDoc(m.documents[0]);
                              }}
                              className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-500/40 font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-red-400" />
                              <span>{m.documents.length} PDF (Ver / Descargar)</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 font-mono">Sin anexos</span>
                          )}

                          <span className="text-slate-400 font-mono text-[10.5px]">
                            {m.personName || m.sourceUserName || 'Oficial'}
                          </span>
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>

          <p className="text-center text-xs text-cyan-500/70 font-mono mt-1">
            💡 Diagrama holográfico HUD interactivo. Haz clic en cualquier radar o tarjeta para ver el proveído completo.
          </p>
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. VISTA "LISTA EJECUTIVA"                                               */
        /* ========================================================================= */
        <div className="relative pl-7 sm:pl-9 space-y-4 before:absolute before:left-3 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-cyan-500/30">
          {[...milestones].reverse().map((m) => (
            <div key={m.id} className="relative">
              <div
                className={`absolute -left-7 sm:-left-9 top-1 w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shadow-xs ${
                  m.isCurrent
                    ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                    : 'bg-[#041a13] border border-cyan-500/50 text-cyan-300'
                }`}
              >
                {m.stepNumber === 0 ? '🌱' : m.stepNumber}
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                m.isCurrent
                  ? 'bg-[#041c14] border-emerald-500'
                  : 'bg-[#03130d] border-cyan-500/20 hover:border-cyan-500/40'
              } space-y-2 text-xs shadow-xs text-white`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap font-black">
                    <span className="text-white">{formatArea(m.sourceArea)}</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-emerald-300">{formatArea(m.targetArea)}</span>
                    {m.personName && <span className="text-slate-400 font-normal">({m.personName})</span>}
                    {m.isCurrent && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[9px] font-black">
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {m.fullDate} • {m.timeStr}
                  </span>
                </div>

                {m.quickStamp && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                    <Stamp className="w-3 h-3 text-cyan-400" />
                    <span>{m.quickStamp}</span>
                  </span>
                )}

                <p className="text-slate-300 pl-3 border-l-2 border-cyan-500/40 italic">
                  &quot;{m.instruction}&quot;
                </p>

                {m.documents.length > 0 && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-white/5">
                    {m.documents.map((doc, di) => (
                      <div key={doc.id || di} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs">
                        <FileText className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-bold truncate max-w-[160px]">{doc.fileName}</span>
                        <button
                          type="button"
                          onClick={() => handleViewDoc(doc)}
                          className="text-[10.5px] font-black text-cyan-400 hover:underline cursor-pointer ml-1"
                        >
                          Ver
                        </button>
                        <a
                          href={getDocumentFullUrl(doc.fileUrl)}
                          download={doc.fileName}
                          className="text-[10.5px] font-black text-slate-400 hover:text-cyan-400 cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL DETALLE EXPANDIDO AL TOCAR CUALQUIER RADAR                        */}
      {/* ========================================================================= */}
      {selectedMilestone && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedMilestone(null)}
        >
          <div
            className="bg-[#03140e] border-2 border-cyan-500/50 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Hito */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                  {selectedMilestone.stepNumber === 0 ? '🌱' : `#${selectedMilestone.stepNumber}`}
                </div>
                <div>
                  <h4 className="font-black text-sm text-white uppercase">
                    {selectedMilestone.badgeLabel}
                  </h4>
                  <span className="text-[11px] font-mono text-cyan-300">
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
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Origen:</span>
                <span className="font-bold text-white">{formatArea(selectedMilestone.sourceArea)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Destino:</span>
                <span className="font-bold text-emerald-300">{formatArea(selectedMilestone.targetArea)}</span>
              </div>
            </div>

            {/* Sello & Instrucción */}
            <div className="space-y-1 text-xs">
              {selectedMilestone.quickStamp && (
                <div className="text-cyan-400 font-black uppercase text-[11px] mb-1">
                  ⚡ {selectedMilestone.quickStamp}
                </div>
              )}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                &quot;{selectedMilestone.instruction}&quot;
              </div>
            </div>

            {/* Documentos Adjuntos */}
            {selectedMilestone.documents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Archivos Adjuntos ({selectedMilestone.documents.length}):</span>
                </span>
                <div className="space-y-2">
                  {selectedMilestone.documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
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
