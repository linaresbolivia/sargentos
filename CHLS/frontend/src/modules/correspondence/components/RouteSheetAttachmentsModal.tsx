import React, { useState } from 'react';
import { RouteSheetItem, CorrDocument } from '../types/correspondence.types';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import { uploadRouteSheetDocuments, fetchRouteSheetById, fetchRouteSheets } from '@store/correspondenceSlice';
import {
  X,
  Paperclip,
  FileText,
  Eye,
  Download,
  UploadCloud,
  ExternalLink,
  ShieldCheck,
  Building2,
  ArrowRight,
  ImageIcon,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getDocumentFullUrl } from '../utils/organigramWorkflowService';

interface RouteSheetAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem;
}

export const RouteSheetAttachmentsModal: React.FC<RouteSheetAttachmentsModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string; fileType?: string | null } | null>(null);

  if (!isOpen) return null;

  const movements = item.movements || [];

  // Recopilar todos los documentos del expediente
  const allDocsMap = new Map<string, CorrDocument>();

  // 1. Documentos generales de la Hoja de Ruta
  (item.documents || []).forEach((doc) => {
    if (doc.id) allDocsMap.set(doc.id, doc);
  });

  // 2. Documentos adjuntos en movimientos/derivaciones
  movements.forEach((mov) => {
    (mov.documents || []).forEach((doc) => {
      if (doc.id) allDocsMap.set(doc.id, { ...doc, movementId: doc.movementId || mov.id });
    });
  });

  const allDocs = Array.from(allDocsMap.values());

  // Agrupación de documentos:
  // a) Documentos de Radicación Inicial (sin movementId)
  const initialDocs = allDocs.filter((d) => !d.movementId);

  // b) Documentos agrupados por cada derivación / proveído
  const movementsWithDocs = movements
    .map((mov) => {
      const docs = allDocs.filter((d) => d.movementId === mov.id);
      return { movement: mov, docs };
    })
    .filter((g) => g.docs.length > 0);

  // c) Huérfanos o asociados a movementId no encontrado
  const knownMovementIds = new Set(movements.map((m) => m.id));
  const otherDocs = allDocs.filter((d) => d.movementId && !knownMovementIds.has(d.movementId));

  const totalCount = allDocs.length;

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading(`Digitalizando y subiendo ${files.length} archivo(s)...`);

    try {
      await dispatch(
        uploadRouteSheetDocuments({
          routeSheetId: item.id,
          files,
        })
      );
      await dispatch(fetchRouteSheetById(item.id));
      await dispatch(fetchRouteSheets());
      toast.success('¡Archivos digitalizados y vinculados exitosamente!', { id: toastId });
    } catch {
      toast.error('Error al subir los archivos adjuntos', { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const renderDocumentRow = (doc: CorrDocument) => {
    const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType?.includes('pdf');
    const isImg = doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) || doc.mimeType?.includes('image');
    const isXls = doc.fileName?.match(/\.(xls|xlsx|csv)$/i) || doc.mimeType?.includes('sheet');

    return (
      <div
        key={doc.id}
        className="p-3.5 rounded-2xl bg-white dark:bg-black/50 border border-slate-200 dark:border-emerald-500/30 flex items-center justify-between gap-3 transition-all hover:border-emerald-500 shadow-xs group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isPdf
                ? 'bg-red-500/15 text-red-600 border-red-500/30'
                : isImg
                ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                : isXls
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
            }`}
          >
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
            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block group-hover:text-emerald-700 dark:group-hover:text-brand-gold transition-colors" title={doc.fileName}>
              {doc.fileName}
            </span>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {doc.fileSize && (
                <span className="text-[10.5px] text-slate-400 font-mono">
                  {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
              {doc.sha256Hash && (
                <span
                  title={`Integridad SHA-256: ${doc.sha256Hash}`}
                  className="text-[9.5px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 truncate max-w-[130px] flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{doc.sha256Hash.substring(0, 8)}...</span>
                </span>
              )}
              {doc.createdAt && (
                <span className="text-[10px] text-slate-400">
                  • {new Date(doc.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })} {new Date(doc.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botones Explícitos: Ver y Descargar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewDoc({ fileName: doc.fileName, fileUrl: doc.fileUrl, fileType: doc.mimeType })}
            title="Visualizar documento en pantalla"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver</span>
          </button>
          <a
            href={getDocumentFullUrl(doc.fileUrl)}
            download={doc.fileName}
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar archivo en su equipo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-brand-gold hover:text-black text-slate-700 dark:text-gray-200 text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-105"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#07110c] border-2 border-emerald-500/40 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a1912] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-brand-gold border-2 border-brand-gold/40 flex items-center justify-center shrink-0 shadow-sm">
              <Paperclip className="w-6 h-6 text-brand-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                  {item.hrCode}
                </span>
                <span className="text-xs font-black uppercase text-slate-500 dark:text-gray-400">
                  Expediente Digital ({totalCount} archivo{totalCount === 1 ? '' : 's'})
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate uppercase mt-0.5" title={item.reference}>
                {item.reference}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Digitalizar / Subir Directo */}
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-black text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer">
              <input
                type="file"
                multiple
                disabled={isUploading}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={handleDirectUpload}
                className="hidden"
              />
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>{isUploading ? 'Digitalizando...' : '+ Adjuntar Archivo'}</span>
            </label>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-red-500 hover:text-white text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {totalCount === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 dark:bg-black/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-emerald-500/20 space-y-3">
              <Paperclip className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="font-black text-sm text-slate-700 dark:text-gray-200">
                Aún no hay archivos adjuntos en este trámite
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Puedes digitalizar y adjuntar cartas escaneadas, comprobantes en PDF, imágenes o cotizaciones haciendo clic en el botón de arriba.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-gold text-black font-black text-xs shadow-md hover:scale-105 transition-all cursor-pointer">
                <input
                  type="file"
                  multiple
                  disabled={isUploading}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={handleDirectUpload}
                  className="hidden"
                />
                <Plus className="w-4 h-4" />
                <span>Digitalizar Primer Archivo Adjunto</span>
              </label>
            </div>
          ) : (
            <>
              {/* SECCIÓN 1: RADICACIÓN INICIAL / MESA DE ENTRADAS */}
              {initialDocs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h4 className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        1. Radicación Inicial • Mesa de Entradas ({initialDocs.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Remitente: {item.senderName} ({item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Club' : 'Externo')})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {initialDocs.map(renderDocumentRow)}
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: DERIVACIONES & PROVEÍDOS */}
              {movementsWithDocs.map(({ movement, docs }) => (
                <div key={movement.id} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-yellow-900 dark:text-brand-gold border border-brand-gold/40">
                        Paso #{movement.sequenceNumber}
                      </span>
                      <span className="font-black text-xs text-slate-800 dark:text-gray-200 uppercase flex items-center gap-1.5">
                        <span>{movement.sourceArea}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-gold" />
                        <span>{movement.targetPersonName ? `${movement.targetPersonName} (${movement.targetArea})` : movement.targetArea}</span>
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      {docs.length} archivo(s) PDF adjunto(s)
                    </span>
                  </div>

                  {/* Instrucción del Proveído resumida */}
                  {movement.instruction && (
                    <p className="text-[11px] text-slate-600 dark:text-gray-400 italic bg-slate-100/70 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 truncate">
                      &quot;{movement.instruction}&quot;
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    {docs.map(renderDocumentRow)}
                  </div>
                </div>
              ))}

              {/* SECCIÓN 3: OTROS ARCHIVOS DIGITALIZADOS */}
              {otherDocs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-gray-300">
                      Otros Archivos Digitalizados ({otherDocs.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {otherDocs.map(renderDocumentRow)}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#0a1811] border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-slate-500 font-mono">
            🛡️ Todos los documentos cuentan con hash criptográfico SHA-256 e inmutabilidad digital.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Submodal Visor de Documentos Interactivo */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#07110c] border border-emerald-500/40 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header del Visor */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-brand-gold shrink-0" />
                <span className="font-black text-sm truncate">{previewDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
};

export default RouteSheetAttachmentsModal;
