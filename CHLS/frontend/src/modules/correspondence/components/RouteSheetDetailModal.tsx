import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { uploadRouteSheetDocuments, fetchRouteSheetById } from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import { PrintableRouteSheet } from './PrintableRouteSheet';
import { AddMovementModal } from './AddMovementModal';
import { MergeRouteSheetsModal } from './MergeRouteSheetsModal';
import { ArchiveRouteSheetModal } from './ArchiveRouteSheetModal';
import { CorrespondenceTimelineView } from './CorrespondenceTimelineView';
import { SlaUrgencyAlertModal } from './SlaUrgencyAlertModal';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Printer,
  Send,
  Clock,
  Building2,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Leaf,
  ArrowRight,
  Stamp,
  Copy,
  Link2,
  FolderArchive,
  MapPin,
  Download,
  ExternalLink,
  Paperclip,
  UploadCloud,
  FileCheck,
  Image as ImageIcon,
  FileSpreadsheet,
  Layers,
  Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';
import { getDocumentFullUrl } from '../utils/organigramWorkflowService';

interface RouteSheetDetailModalProps {
  item: RouteSheetItem | null;
  onClose: () => void;
}

export const RouteSheetDetailModal: React.FC<RouteSheetDetailModalProps> = ({ item, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedReduxItem = useSelector((state: RootState) => state.correspondence.selectedItem);
  
  // Usar la versión más reciente en Redux si coincide el ID para actualización reactiva en vivo
  const currentItem = (selectedReduxItem && selectedReduxItem.id === item?.id) ? selectedReduxItem : item;

  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'MOVEMENTS'>('TIMELINE');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  if (!currentItem) return null;

  const movements = currentItem.movements || [];
  const documents = currentItem.documents || [];
  const isFusedChild = currentItem.currentArea.startsWith('FUSIONADO EN') || currentItem.aiSummary?.startsWith('FUSIONADO');

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsUploadingDocs(true);
      const toastId = toast.loading('Digitalizando y guardando documentos...');
      try {
        await dispatch(uploadRouteSheetDocuments({ routeSheetId: currentItem.id, files }));
        await dispatch(fetchRouteSheetById(currentItem.id));
        toast.success(`¡${files.length} documento(s) digitalizado(s) exitosamente!`, { id: toastId });
      } catch {
        toast.error('Error al digitalizar el documento', { id: toastId });
      } finally {
        setIsUploadingDocs(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECIBIDO':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'DERIVADO':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'EN_PROCESO':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'OBSERVADO':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
      case 'CONCLUIDO':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const verificationUrl = `${window.location.origin}/correspondencia?code=${encodeURIComponent(currentItem.hrCode)}`;

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 lg:p-8 animate-fadeIn">
        <div className="bg-white dark:bg-[#0c1410] border-2 border-slate-200 dark:border-emerald-500/30 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Top Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/80 dark:bg-black/30 flex-wrap gap-3">
            <div className="flex items-center gap-3.5">
              <CrestLogo size="sm" className="w-11 h-11 shrink-0" />
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-black text-emerald-950 dark:text-emerald-300 bg-emerald-500/20 dark:bg-emerald-950/80 px-3 py-0.5 rounded-xl border border-emerald-500/40 tracking-wider">
                    {currentItem.hrCode}
                  </span>
                  <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-xs ${getStatusBadge(currentItem.status)}`}>
                    {currentItem.status}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-gray-400 font-mono">
                    CITE: {currentItem.cite || 'S/N'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Expediente & Trazabilidad 360°
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-brand-gold" />
                <span className="hidden sm:inline">Imprimir 1:1</span>
              </button>

              {!isFusedChild && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                >
                  <Link2 className="w-4 h-4 text-brand-gold" />
                  <span className="hidden sm:inline">+ Fusionar</span>
                </button>
              )}

              {currentItem.status !== 'CONCLUIDO' && (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-emerald-500/20 text-slate-800 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-300 dark:border-white/10 hover:border-emerald-500/50 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4 text-brand-gold" />
                  <span>Archivar</span>
                </button>
              )}

              <button
                onClick={() => setShowAddMovementModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black px-4.5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-brand-gold/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>+ Derivar / Proveído</span>
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* View Mode Tabs & Actions Bar */}
          <div className="px-6 sm:px-8 py-2.5 bg-slate-100/70 dark:bg-black/40 border-b border-slate-200 dark:border-white/5 flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-white/10 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('TIMELINE')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'TIMELINE'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🧭 Timeline Visual 360°</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MOVEMENTS')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'MOVEMENTS'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>📋 Proveídos & Expediente Digital ({movements.length})</span>
              </button>
            </div>

            {/* Quick SLA Trigger Button */}
            {currentItem.status !== 'CONCLUIDO' && (
              <button
                type="button"
                onClick={() => setShowSlaModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 animate-pulse" />
                <span>Alertar Vencimiento SLA</span>
              </button>
            )}
          </div>

          {/* Modal Content */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-sm">
            
            {activeTab === 'TIMELINE' ? (
              <CorrespondenceTimelineView
                item={currentItem}
                onOpenSlaModal={() => setShowSlaModal(true)}
                onAddMovement={() => setShowAddMovementModal(true)}
              />
            ) : (
              <>
            {/* If Archived: Show Archive Location Banner */}
            {currentItem.archiveLocation && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border-2 border-emerald-500/40 flex items-start gap-3.5 shadow-md animate-fadeIn">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shrink-0 mt-0.5">
                  <FolderArchive className="w-5 h-5 text-brand-gold" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                      Expediente Resguardado en Archivo Central
                    </span>
                    {currentItem.archivedAt && (
                      <span className="text-[10.5px] font-mono text-slate-500 dark:text-gray-400">
                        ({new Date(currentItem.archivedAt).toLocaleDateString('es-BO')})
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Ubicación Topográfica: <strong className="text-emerald-700 dark:text-brand-gold">{currentItem.archiveLocation}</strong>
                    {currentItem.archiveBox ? ` — ${currentItem.archiveBox}` : ''}
                  </p>
                  {currentItem.archiveNotes && (
                    <p className="text-[11.5px] text-slate-600 dark:text-gray-300 italic">
                      Auto de Conclusión: "{currentItem.archiveNotes}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* If Fused Child: Show Alert Banner */}
            {isFusedChild && (
              <div className="flex items-center gap-3 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                <div className="text-xs">
                  <strong className="block font-black uppercase text-sm">Trámite Acumulado y Fusionado</strong>
                  Este expediente y sus antecedentes fueron fusionados formalmente en la Hoja de Ruta principal <strong>{currentItem.currentArea}</strong>.
                </div>
              </div>
            )}

            {/* Paperless Eco Banner */}
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 px-5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Leaf className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold">
                  Iniciativa CHLS Cero Papel — Expediente Oficial con Firma Digital y Validador QR
                </span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-300">
                {currentItem.pageCount || 1} Folio(s)
              </span>
            </div>

            {/* Main Header Data Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/90 dark:border-white/5">
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Referencia / Asunto
                </span>
                <p className="text-sm font-black text-slate-950 dark:text-white leading-relaxed uppercase">
                  {currentItem.reference}
                </p>
                {currentItem.attachmentDescription && (
                  <p className="text-xs text-slate-700 dark:text-gray-400 mt-2">
                    <strong className="text-slate-950 dark:text-gray-200 font-bold">Adjunto:</strong> {currentItem.attachmentDescription}
                  </p>
                )}
              </div>

              {/* QR Verification Card */}
              <div className="flex items-center justify-end gap-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-3 md:pt-0 md:pl-4">
                <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-sm shrink-0">
                  <QRCodeSVG value={verificationUrl} size={64} level="M" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Área Actual</span>
                  <span className="text-xs font-black text-emerald-900 dark:text-brand-gold uppercase block">
                    {currentItem.currentArea}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    {new Date(currentItem.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Sender & Origin Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/5">
                <span className="text-slate-500 uppercase text-[10px] font-black block mb-0.5">Remitente</span>
                <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-gold" />
                  {currentItem.senderName}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/5">
                <span className="text-slate-500 uppercase text-[10px] font-black block mb-0.5">Origen / Empresa</span>
                <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {currentItem.senderArea || (currentItem.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/5">
                <span className="text-slate-500 uppercase text-[10px] font-black block mb-0.5">Radicado Por</span>
                <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  {currentItem.createdBy?.firstName} {currentItem.createdBy?.lastName || 'Secretaría'}
                </span>
              </div>
            </div>

            {/* Expediente Digital 360° & Documentos Escaneados */}
            <div className="bg-slate-50/90 dark:bg-[#0c1a13] border border-slate-200 dark:border-emerald-500/30 rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-emerald-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Paperclip className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Expediente Digital & Documentos Escaneados ({documents.length})</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                        Cero Papel
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      Archivos oficiales digitalizados con hash criptográfico SHA-256 de inmutabilidad
                    </p>
                  </div>
                </div>

                {/* Direct Upload Button */}
                <label className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-black text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    disabled={isUploadingDocs}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    onChange={handleDirectUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isUploadingDocs ? 'Digitalizando...' : '+ Digitalizar / Adjuntar'}</span>
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-6 bg-white/60 dark:bg-black/30 rounded-2xl border border-dashed border-slate-200 dark:border-emerald-500/20">
                  <UploadCloud className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-gray-300">
                    No se han digitalizado anexos físicos todavía para esta Hoja de Ruta.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Puedes adjuntar el PDF de la carta recibida, facturas, fotos de celulares o cotizaciones en cualquier momento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((doc, idx) => {
                    const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType?.includes('pdf');
                    const isImg = doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) || doc.mimeType?.includes('image');
                    const isXls = doc.fileName?.match(/\.(xls|xlsx|csv)$/i) || doc.mimeType?.includes('sheet');

                    return (
                      <div
                        key={doc.id || idx}
                        className="p-3.5 rounded-2xl bg-white dark:bg-black/50 border border-slate-200 dark:border-emerald-500/30 flex items-center justify-between gap-3 transition-all hover:border-emerald-500 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isPdf
                              ? 'bg-red-500/15 text-red-600 border-red-500/30'
                              : isImg
                              ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                              : isXls
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
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
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                              {doc.fileName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {doc.fileSize && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                                </span>
                              )}
                              {doc.sha256Hash && (
                                <span
                                  title={`SHA-256: ${doc.sha256Hash}`}
                                  className="text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 truncate max-w-[130px]"
                                >
                                  🛡️ {doc.sha256Hash.substring(0, 10)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Download / View Button */}
                        <a
                          href={getDocumentFullUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir / Descargar documento original"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/20 text-slate-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timeline of Movements / Proveídos */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-brand-gold" />
                  <span>Historial de Instrucciones & Proveídos ({movements.length})</span>
                </h3>
              </div>

              {movements.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Aún no se han emitido proveídos para esta Hoja de Ruta.</p>
                  <button
                    onClick={() => setShowAddMovementModal(true)}
                    className="mt-3 text-xs font-bold text-brand-gold hover:underline"
                  >
                    + Emitir primer proveído ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((mov, idx) => (
                    <div
                      key={mov.id || idx}
                      className="bg-slate-50 dark:bg-[#0f1a14] border border-slate-200/70 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden transition-all hover:border-brand-gold/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-black flex items-center justify-center">
                              #{mov.sequenceNumber}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-white">
                              A: {mov.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov.targetArea}
                            </span>
                            {mov.quickStamp && (
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                                mov.quickStamp.includes('FUSIONADO') || mov.quickStamp.includes('ACUMULADO')
                                  ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/40 shadow-xs'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              }`}>
                                {mov.quickStamp}
                              </span>
                            )}
                          </div>

                          <div className="pl-8 space-y-2">
                            {mov.instruction.startsWith('[EXPEDIENTE ACUMULADO') ? (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                                <span className="text-[10px] font-black tracking-wider uppercase block text-amber-600 dark:text-brand-gold mb-1">
                                  {mov.instruction.split('\n')[0]}
                                </span>
                                <p className="text-xs font-medium whitespace-pre-wrap">
                                  {mov.instruction.split('\n').slice(1).join('\n')}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-700 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-wrap">
                                {mov.instruction.split('\n[C.C.:')[0]}
                              </p>
                            )}

                            {mov.instruction.includes('[C.C.:') && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-[11px] font-bold">
                                <Copy className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                                <span>Con Copia a: {mov.instruction.split('[C.C.: ')[1]?.replace(']', '')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stamp & Date Block */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono block">
                            {new Date(mov.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mt-1">
                            {mov.sourceUser?.firstName} {mov.sourceUser?.lastName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </>
            )}

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">
              ID Sistema: {currentItem.id}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrintModal(true)}
                className="font-bold text-slate-700 dark:text-gray-300 hover:text-brand-gold transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Vista Previa de Impresión</span>
              </button>
              <button
                onClick={onClose}
                className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Submodal for Adding Movements */}
      {showAddMovementModal && (
        <AddMovementModal
          isOpen={showAddMovementModal}
          onClose={() => setShowAddMovementModal(false)}
          item={currentItem}
        />
      )}

      {/* Submodal for Printable Sheet */}
      {showPrintModal && (
        <PrintableRouteSheet
          item={currentItem}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Submodal for Merging Route Sheets */}
      {showMergeModal && (
        <MergeRouteSheetsModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          targetItem={currentItem}
        />
      )}

      {/* Submodal for Archiving in Central Archive */}
      {showArchiveModal && (
        <ArchiveRouteSheetModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          item={currentItem}
        />
      )}

      {/* Submodal for SLA Urgency Alert */}
      {showSlaModal && (
        <SlaUrgencyAlertModal
          isOpen={showSlaModal}
          onClose={() => setShowSlaModal(false)}
          item={currentItem}
        />
      )}
    </>
  );
};
export default RouteSheetDetailModal;
