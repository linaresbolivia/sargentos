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
                onClick={() => setShowTimelinePrintModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/35 hover:to-teal-600/35 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                title="Imprimir o guardar en PDF el reporte oficial de trazabilidad con tabla ejecutiva y logo CHLS"
              >
                <Printer className="w-4 h-4 text-emerald-600 dark:text-brand-gold" />
                <span className="hidden sm:inline">Imprimir Timeline (PDF)</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Imprimir carátula y carpeta física oficial de la Hoja de Ruta"
              >
                <Printer className="w-4 h-4 text-brand-gold" />
                <span className="hidden sm:inline">Imprimir Hoja de Ruta</span>
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
                onClick={onClose}
                className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
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
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20 text-xs flex-wrap gap-3">
            <span className="text-slate-400 font-mono text-[11px]">
              ID Sistema: {currentItem.id}
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Botón Solicitado: Expediente Completo al final de la hoja */}
              <button
                type="button"
                onClick={handleGenerateDossierPdf}
                disabled={isGeneratingDossier}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-400 hover:to-teal-500 text-slate-950 font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-md shadow-amber-500/20 border border-amber-400/50 cursor-pointer disabled:opacity-50"
                title="Genera y descarga un único PDF con todo el expediente: carátula, datos de derivación de cada usuario y todos los archivos adjuntos integrados físicamente"
              >
                {isGeneratingDossier ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Compilando Expediente...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 text-slate-950" />
                    <span>📚 Expediente Completo (PDF)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowTimelinePrintModal(true)}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-brand-gold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Timeline 360°</span>
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="font-bold text-slate-700 dark:text-gray-300 hover:text-brand-gold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hoja de Ruta</span>
              </button>
              <button
                onClick={onClose}
                className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer"
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
