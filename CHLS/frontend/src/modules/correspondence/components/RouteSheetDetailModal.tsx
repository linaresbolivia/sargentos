import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { uploadRouteSheetDocuments, fetchRouteSheetById } from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import { PrintableRouteSheet } from './PrintableRouteSheet';
import { PrintableTimelineReportModal } from './PrintableTimelineReportModal';
import { AddMovementModal } from './AddMovementModal';
import { MergeRouteSheetsModal } from './MergeRouteSheetsModal';
import { ArchiveRouteSheetModal } from './ArchiveRouteSheetModal';
import { CorrespondenceTimelineView } from './CorrespondenceTimelineView';
import { SlaUrgencyAlertModal } from './SlaUrgencyAlertModal';
import {
  X,
  Printer,
  Link2,
  FolderArchive,
  FileText,
  Download,
  ExternalLink,
  Paperclip,
  BookOpen,
  Loader2,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';
import { getDocumentFullUrl } from '../utils/organigramWorkflowService';
import { api } from '@config/api';

interface RouteSheetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem | null;
}

export const RouteSheetDetailModal: React.FC<RouteSheetDetailModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedReduxItem = useSelector((state: RootState) => state.correspondence.selectedItem);
  
  // Usar la versión más reciente en Redux si coincide el ID para actualización reactiva en vivo
  const rawItem = (selectedReduxItem && (selectedReduxItem.id === item?.id || (selectedReduxItem as any).routeSheet?.id === item?.id)) ? selectedReduxItem : item;
  const currentItem: RouteSheetItem | null = (rawItem as any)?.routeSheet || rawItem;

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showTimelinePrintModal, setShowTimelinePrintModal] = useState(false);
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string; fileType?: string | null } | null>(null);
  const [isGeneratingDossier, setIsGeneratingDossier] = useState(false);

  if (!currentItem) return null;

  const handleGenerateDossierPdf = async () => {
    try {
      setIsGeneratingDossier(true);
      toast.loading('Compilando expediente y fusionando adjuntos físicos...', { id: 'dossier-load' });

      const response = await api.get(`/correspondence/route-sheets/${currentItem.id}/dossier-pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Expediente_Completo_${currentItem.hrCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success('¡Expediente Completo compilado y descargado exitosamente!', { id: 'dossier-load' });
    } catch {
      toast.error('Error al generar el Expediente Completo Unificado en PDF', { id: 'dossier-load' });
    } finally {
      setIsGeneratingDossier(false);
    }
  };

  const movements = currentItem.movements || [];
  const documents = currentItem.documents || [];
  const isFusedChild = Boolean(
    currentItem.currentArea?.startsWith('FUSIONADO EN') ||
    currentItem.aiSummary?.startsWith('FUSIONADO')
  );

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
        <div className="bg-white dark:bg-[#0c1410] border-2 border-slate-200 dark:border-emerald-500/30 w-full max-w-6xl xl:max-w-7xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Top Header */}
          <div className="px-6 sm:px-8 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-[#0c1410] flex flex-col gap-3.5">
            <div className="flex justify-between items-center">
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

              {/* Cerrar (X) */}
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900 text-slate-300 hover:text-white border border-emerald-500/30 hover:border-red-400/60 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:shadow-[0_0_18px_rgba(239,68,68,0.35)] transition-all hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modern Centered Touch Screen Command Bar with Subtle Glow */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 flex-wrap pt-0.5">
              {/* 1. Imprimir Timeline (PDF) */}
              <button
                type="button"
                onClick={() => setShowTimelinePrintModal(true)}
                className="flex items-center gap-2 bg-gradient-to-b from-emerald-950/90 to-[#042014]/95 hover:from-emerald-900/90 hover:to-emerald-950 text-white border border-emerald-500/50 hover:border-emerald-400 px-4 sm:px-4.5 py-2.5 rounded-2xl text-xs sm:text-[13px] font-bold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.22)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none touch-manipulation backdrop-blur-md"
                title="Imprimir o guardar en PDF el reporte oficial de trazabilidad con tabla ejecutiva y logo CHLS"
              >
                <Printer className="w-4 h-4 text-brand-gold shrink-0 drop-shadow-[0_0_6px_rgba(204,161,75,0.45)]" />
                <span>Imprimir Timeline (PDF)</span>
              </button>

              {/* 2. Imprimir Hoja de Ruta */}
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 bg-gradient-to-b from-emerald-950/90 to-[#042014]/95 hover:from-emerald-900/90 hover:to-emerald-950 text-white border border-emerald-500/50 hover:border-emerald-400 px-4 sm:px-4.5 py-2.5 rounded-2xl text-xs sm:text-[13px] font-bold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.22)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none touch-manipulation backdrop-blur-md"
                title="Imprimir carátula y carpeta física oficial de la Hoja de Ruta"
              >
                <Printer className="w-4 h-4 text-brand-gold shrink-0 drop-shadow-[0_0_6px_rgba(204,161,75,0.45)]" />
                <span>Imprimir Hoja de Ruta</span>
              </button>

              {/* 3. + Fusionar */}
              {!isFusedChild && (
                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-b from-emerald-950/90 to-[#042014]/95 hover:from-emerald-900/90 hover:to-emerald-950 text-white border border-emerald-500/50 hover:border-emerald-400 px-4 sm:px-4.5 py-2.5 rounded-2xl text-xs sm:text-[13px] font-bold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.22)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none touch-manipulation backdrop-blur-md"
                  title="Fusionar con otra Hoja de Ruta"
                >
                  <Link2 className="w-4 h-4 text-brand-gold shrink-0 drop-shadow-[0_0_6px_rgba(204,161,75,0.45)]" />
                  <span>+ Fusionar</span>
                </button>
              )}

              {/* 4. Archivar */}
              {currentItem.status !== 'CONCLUIDO' && (
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-b from-emerald-950/90 to-[#042014]/95 hover:from-emerald-900/90 hover:to-emerald-950 text-white border border-emerald-500/50 hover:border-emerald-400 px-4 sm:px-4.5 py-2.5 rounded-2xl text-xs sm:text-[13px] font-bold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.22)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none touch-manipulation backdrop-blur-md"
                  title="Archivar expediente en archivo central"
                >
                  <FolderArchive className="w-4 h-4 text-brand-gold shrink-0 drop-shadow-[0_0_6px_rgba(204,161,75,0.45)]" />
                  <span>Archivar</span>
                </button>
              )}

              {/* 5. + Derivar / Proveído */}
              {currentItem.status !== 'CONCLUIDO' && (
                <button
                  type="button"
                  onClick={() => setShowAddMovementModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-600 text-white border border-emerald-300/60 hover:border-emerald-200 px-5 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-[13px] font-black tracking-wide shadow-[0_0_22px_rgba(16,185,129,0.45)] hover:shadow-[0_0_32px_rgba(16,185,129,0.75)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none touch-manipulation"
                  title="Derivar expediente o registrar un nuevo proveído formal"
                >
                  <Send className="w-4 h-4 text-brand-gold shrink-0 drop-shadow-[0_0_6px_rgba(204,161,75,0.6)]" />
                  <span>+ Derivar / Proveído</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Content: Unified Timeline Visual 360° */}
          <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 flex-1 text-sm">
            <CorrespondenceTimelineView
              item={currentItem}
              onOpenSlaModal={() => setShowSlaModal(true)}
              onAddMovement={() => setShowAddMovementModal(true)}
              onPreviewDoc={setPreviewDoc}
              onPrintTimeline={() => setShowTimelinePrintModal(true)}
            />
          </div>

          {/* Footer Bar (Al final de la Hoja de Ruta) */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 items-center bg-slate-50/50 dark:bg-black/20 text-xs gap-3">
            {/* Left: ID Sistema */}
            <div className="text-left text-slate-400 font-mono text-[11px] truncate">
              ID Sistema: {currentItem.id}
            </div>

            {/* Center: Botón Expediente Completo en Dorado Metálico */}
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={handleGenerateDossierPdf}
                disabled={isGeneratingDossier}
                className="relative group overflow-hidden inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,#825d1e_0%,#c59a3f_22%,#fef0bc_45%,#e5bb64_55%,#b3852d_78%,#6d4b14_100%)] text-[#1f1402] font-black text-xs tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),inset_0_-1px_1px_rgba(0,0,0,0.35),0_4px_16px_rgba(184,138,50,0.35)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_6px_24px_rgba(220,175,80,0.55)] border border-[#fae29f]/90 cursor-pointer disabled:opacity-50 select-none touch-manipulation"
                title="Genera y descarga un único PDF con todo el expediente: carátula, datos de derivación de cada usuario y todos los archivos adjuntos integrados físicamente"
              >
                {/* Reflejo metálico dinámico al interactuar */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                {isGeneratingDossier ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1f1402]" />
                    <span className="drop-shadow-[0_1px_0px_rgba(255,255,255,0.4)]">Compilando Expediente...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 text-[#1f1402] shrink-0 drop-shadow-[0_1px_0px_rgba(255,255,255,0.4)]" />
                    <span className="drop-shadow-[0_1px_0px_rgba(255,255,255,0.4)]">Expediente Completo (PDF)</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Botón Cerrar */}
            <div className="flex justify-end items-center">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white px-5 py-2.5 rounded-xl font-bold transition-colors cursor-pointer"
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

      {/* Submodal for Printable Timeline Report (Table/List with CHLS Logo) */}
      {showTimelinePrintModal && (
        <PrintableTimelineReportModal
          isOpen={showTimelinePrintModal}
          onClose={() => setShowTimelinePrintModal(false)}
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

      {/* Submodal Visor de Documentos Digitalizados */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#07110c] border border-emerald-500/40 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header del Visor */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-brand-gold shrink-0" />
                <span className="font-black text-sm truncate">{previewDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Botón Imprimir Documento / Expediente */}
                <button
                  type="button"
                  onClick={() => {
                    const iframe = document.getElementById('preview-doc-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    } else {
                      window.open(getDocumentFullUrl(previewDoc.fileUrl), '_blank');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black hover:scale-105 transition-all shadow-md cursor-pointer"
                  title="Imprimir este documento directamente"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>

                {/* Si es el Expediente Completo Unificado: Botón directo para pasar a Archivo Central */}
                {previewDoc.fileName.startsWith('Expediente_Completo_') && currentItem.status !== 'CONCLUIDO' && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDoc(null);
                      setShowArchiveModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black hover:scale-105 transition-all shadow-md cursor-pointer"
                    title="Proceder al archivo físico y digital definitivo en Archivo Central"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>Mandar a Archivo Central</span>
                  </button>
                )}

                <a
                  href={getDocumentFullUrl(previewDoc.fileUrl)}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-black hover:scale-105 transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar</span>
                </a>
                <a
                  href={getDocumentFullUrl(previewDoc.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Abrir en pestaña completa"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500 text-white transition-colors cursor-pointer"
                  title="Cerrar visor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del Documento */}
            <div className="flex-1 bg-slate-100 dark:bg-black/90 p-2 sm:p-4 overflow-auto flex items-center justify-center">
              {previewDoc.fileName.toLowerCase().endsWith('.pdf') || previewDoc.fileType === 'application/pdf' ? (
                <iframe
                  id="preview-doc-iframe"
                  src={getDocumentFullUrl(previewDoc.fileUrl)}
                  title={previewDoc.fileName}
                  className="w-full h-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white"
                />
              ) : previewDoc.fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                <img
                  src={getDocumentFullUrl(previewDoc.fileUrl)}
                  alt={previewDoc.fileName}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-slate-300 dark:border-white/10"
                />
              ) : (
                <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 max-w-md">
                  <Paperclip className="w-12 h-12 text-brand-gold mx-auto mb-3" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">{previewDoc.fileName}</h4>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                    Este tipo de archivo requiere descargarse para visualizarse en su equipo.
                  </p>
                  <a
                    href={getDocumentFullUrl(previewDoc.fileUrl)}
                    download={previewDoc.fileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-black font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
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
    </>
  );
};
export default RouteSheetDetailModal;
