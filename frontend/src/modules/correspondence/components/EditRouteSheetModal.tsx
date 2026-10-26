import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import {
  updateRouteSheet,
  uploadRouteSheetDocuments,
  deleteRouteSheetDocument,
  fetchRouteSheetById,
  fetchRouteSheets,
  fetchCorrespondenceStats,
} from '@store/correspondenceSlice';
import { RouteSheetItem, RouteSheetPriority, RouteSheetSenderType, CorrDocument } from '../types/correspondence.types';
import {
  X,
  Save,
  FileText,
  User,
  Paperclip,
  Edit3,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  UploadCloud,
  Plus,
  ImageIcon,
  FileSpreadsheet,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';
import { getDocumentFullUrl } from '../utils/organigramWorkflowService';

interface EditRouteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem | null;
  onUpdated?: (updated: RouteSheetItem) => void;
}

export const EditRouteSheetModal: React.FC<EditRouteSheetModalProps> = ({
  isOpen,
  onClose,
  item,
  onUpdated,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [reference, setReference] = useState('');
  const [cite, setCite] = useState('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [priority, setPriority] = useState<RouteSheetPriority>('NORMAL');
  const [senderType, setSenderType] = useState<RouteSheetSenderType>('AREA_INTERNA');
  const [senderName, setSenderName] = useState('');
  const [senderArea, setSenderArea] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderDoc, setSenderDoc] = useState('');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjuntos existentes y gestión de reemplazo/carga
  const [existingDocs, setExistingDocs] = useState<CorrDocument[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string; fileType?: string | null } | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
  const [isUploadingInstant, setIsUploadingInstant] = useState(false);

  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const newFilesInputRef = useRef<HTMLInputElement | null>(null);

  const extractAllDocs = (rtItem: RouteSheetItem): CorrDocument[] => {
    const map = new Map<string, CorrDocument>();
    (rtItem.documents || []).forEach((d) => {
      if (!map.has(d.id)) map.set(d.id, d);
    });
    (rtItem.movements || []).forEach((mov) => {
      (mov.documents || []).forEach((d) => {
        if (!map.has(d.id)) {
          map.set(d.id, { ...d, movementId: d.movementId || mov.id });
        }
      });
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    if (item && isOpen) {
      setReference(item.reference || '');
      setCite(item.cite || '');
      setPageCount(item.pageCount || 1);
      setPriority(item.priority || 'NORMAL');
      setSenderType(item.senderType || 'AREA_INTERNA');
      setSenderName(item.senderName || '');
      setSenderArea(item.senderArea || '');
      setSenderPhone(item.senderPhone || '');
      setSenderEmail(item.senderEmail || '');
      setSenderDoc(item.senderDoc || '');
      setAttachmentDescription(item.attachmentDescription || '');
      setNewFiles([]);
      setExistingDocs(extractAllDocs(item));

      // Cargar datos frescos del expediente por ID
      if (item.id) {
        dispatch(fetchRouteSheetById(item.id))
          .unwrap()
          .then((fresh) => {
            if (fresh) {
              setExistingDocs(extractAllDocs(fresh));
            }
          })
          .catch(() => {});
      }
    }
  }, [item, isOpen, dispatch]);

  if (!isOpen || !item) return null;

  // Manejo de eliminación individual de adjunto existente
  const handleDeleteExistingDoc = async (docId: string, docName: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el archivo adjunto "${docName}" de este expediente?`)) {
      return;
    }
    setIsDeletingDocId(docId);
    const toastId = toast.loading(`Eliminando archivo "${docName}"...`);
    try {
      const res = await dispatch(deleteRouteSheetDocument({ routeSheetId: item.id, documentId: docId })).unwrap();
      setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Archivo adjunto eliminado correctamente 🗑️', { id: toastId });
      if (res?.data && onUpdated) {
        onUpdated(res.data);
      }
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Error al eliminar el archivo adjunto', { id: toastId });
    } finally {
      setIsDeletingDocId(null);
    }
  };

  // Disparar selector para reemplazar archivo específico
  const handleTriggerReplace = (docId: string) => {
    setReplacingDocId(docId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  // Ejecutar reemplazo de archivo específico
  const handleExecuteReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId || !item) return;

    const oldDoc = existingDocs.find((d) => d.id === replacingDocId);
    const oldDocId = replacingDocId;
    setReplacingDocId(null);

    const toastId = toast.loading(`Reemplazando "${oldDoc?.fileName || 'documento'}" por "${file.name}"...`);
    setIsSubmitting(true);

    try {
      // 1. Subir nuevo archivo
      await dispatch(
        uploadRouteSheetDocuments({
          routeSheetId: item.id,
          files: [file],
        })
      ).unwrap();

      // 2. Eliminar el archivo antiguo
      await dispatch(
        deleteRouteSheetDocument({
          routeSheetId: item.id,
          documentId: oldDocId,
        })
      ).unwrap();

      // 3. Recargar estado fresco
      const fresh = await dispatch(fetchRouteSheetById(item.id)).unwrap();
      if (fresh) {
        setExistingDocs(extractAllDocs(fresh));
        if (onUpdated) onUpdated(fresh);
      }

      toast.success(`Archivo reemplazado exitosamente por "${file.name}" 🔄✨`, { id: toastId });
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Error al reemplazar el archivo adjunto', { id: toastId });
    } finally {
      setIsSubmitting(false);
      e.target.value = '';
    }
  };

  // Agregar nuevos archivos a la cola de carga
  const handleSelectNewFiles = (incomingList: FileList | File[]) => {
    const incoming = Array.from(incomingList);
    if (incoming.length === 0) return;
    setNewFiles((prev) => {
      const existingSignatures = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const filtered = incoming.filter((f) => !existingSignatures.has(`${f.name}_${f.size}`));
      return [...prev, ...filtered];
    });
  };

  const handleRemovePendingNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Subida inmediata de los nuevos archivos agregados en cola
  const handleUploadInstantPendingFiles = async () => {
    if (newFiles.length === 0 || !item) return;
    setIsUploadingInstant(true);
    const toastId = toast.loading(`Digitalizando y subiendo ${newFiles.length} archivo(s)...`);
    try {
      await dispatch(
        uploadRouteSheetDocuments({
          routeSheetId: item.id,
          files: newFiles,
        })
      ).unwrap();

      const fresh = await dispatch(fetchRouteSheetById(item.id)).unwrap();
      if (fresh) {
        setExistingDocs(extractAllDocs(fresh));
        if (onUpdated) onUpdated(fresh);
      }
      setNewFiles([]);
      toast.success('¡Nuevos archivos adjuntos vinculados con éxito! 📎✨', { id: toastId });
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Error al subir los archivos', { id: toastId });
    } finally {
      setIsUploadingInstant(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reference.trim()) {
      toast.error('El asunto o referencia es obligatorio');
      return;
    }
    if (!senderName.trim()) {
      toast.error('El nombre del remitente es obligatorio');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Guardando modificaciones en la Hoja de Ruta...');

    try {
      const payload = {
        reference: reference.trim().toUpperCase(),
        cite: cite.trim() ? cite.trim().toUpperCase() : null,
        pageCount: Math.max(1, Number(pageCount) || 1),
        priority,
        senderType,
        senderName: senderName.trim().toUpperCase(),
        senderArea: senderArea.trim() ? senderArea.trim().toUpperCase() : null,
        senderPhone: senderPhone.trim() || null,
        senderEmail: senderEmail.trim() || null,
        senderDoc: senderDoc.trim() || null,
        attachmentDescription: attachmentDescription.trim() ? attachmentDescription.trim().toUpperCase() : null,
      };

      const action = await dispatch(updateRouteSheet({ id: item.id, data: payload }));

      if (updateRouteSheet.fulfilled.match(action)) {
        let updatedResult = action.payload;

        // Subir nuevos archivos pendientes si los hubiera
        if (newFiles.length > 0) {
          try {
            await dispatch(
              uploadRouteSheetDocuments({
                routeSheetId: item.id,
                files: newFiles,
              })
            ).unwrap();
            const fresh = await dispatch(fetchRouteSheetById(item.id)).unwrap();
            if (fresh) updatedResult = fresh;
          } catch (uploadErr) {
            toast.error('Datos guardados, pero hubo un detalle al subir algunos adjuntos.');
          }
        }

        toast.success(`Hoja de Ruta ${item.hrCode} actualizada correctamente 💾✨`, { id: toastId });
        await dispatch(fetchRouteSheets());
        dispatch(fetchCorrespondenceStats());
        if (onUpdated) {
          onUpdated(updatedResult);
        }
        onClose();
      } else {
        toast.error((action.payload as string) || 'Error al actualizar la Hoja de Ruta', { id: toastId });
      }
    } catch {
      toast.error('Error inesperado al guardar modificaciones', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizador de fila de archivo
  const renderDocumentRow = (doc: CorrDocument) => {
    const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType?.includes('pdf');
    const isImg = doc.fileName?.match(/\.(jpg|jpeg|png|webp|svg)$/i) || doc.mimeType?.includes('image');
    const isXls = doc.fileName?.match(/\.(xls|xlsx|csv)$/i) || doc.mimeType?.includes('sheet');
    const isDeleting = isDeletingDocId === doc.id;

    return (
      <div
        key={doc.id}
        className="p-3 rounded-2xl bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-all shadow-xs group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isPdf
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                : isImg
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : isXls
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
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
            <span
              className="font-bold text-xs text-slate-900 dark:text-white truncate block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
              title={doc.fileName}
            >
              {doc.fileName}
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {doc.fileSize && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
              {doc.sha256Hash && (
                <span
                  title={`Integridad SHA-256: ${doc.sha256Hash}`}
                  className="text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 truncate max-w-[120px] flex items-center gap-1"
                >
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                  <span>{doc.sha256Hash.substring(0, 8)}...</span>
                </span>
              )}
              {doc.createdAt && (
                <span className="text-[10px] text-slate-400">
                  • {new Date(doc.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones del Adjunto: Ver, Reemplazar, Descargar, Eliminar */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewDoc({ fileName: doc.fileName, fileUrl: doc.fileUrl, fileType: doc.mimeType })}
            title="Visualizar documento en pantalla"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer shadow-xs hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerReplace(doc.id)}
            disabled={isSubmitting || isDeleting}
            title="Cambiar/Reemplazar este archivo por uno nuevo"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer shadow-xs hover:scale-105 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cambiar</span>
          </button>

          <a
            href={getDocumentFullUrl(doc.fileUrl)}
            download={doc.fileName}
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar archivo a su equipo"
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-[11px] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => handleDeleteExistingDoc(doc.id, doc.fileName)}
            disabled={isSubmitting || isDeleting}
            title="Eliminar este archivo adjunto"
            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/20 transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#07110c] border border-slate-200 dark:border-emerald-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-fadeIn">
        {/* Input oculto para reemplazo 1 a 1 de archivo */}
        <input
          type="file"
          ref={replaceFileInputRef}
          onChange={handleExecuteReplace}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          className="hidden"
        />

        {/* Input oculto para selección de nuevos adjuntos */}
        <input
          type="file"
          ref={newFilesInputRef}
          multiple
          onChange={(e) => {
            if (e.target.files) handleSelectNewFiles(e.target.files);
            e.target.value = '';
          }}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          className="hidden"
        />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-sm text-[#00A652] dark:text-emerald-400 bg-[#00A652]/10 px-2 py-0.5 rounded-md border border-[#00A652]/20">
                  {item.hrCode}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  EDICIÓN OFICIAL & ADJUNTOS
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Editar Datos y Documentos de la Hoja de Ruta
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs flex-1">
          {/* SECCIÓN 1: ASUNTO Y CITE */}
          <div className="bg-slate-50/90 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
              <FileText className="w-4 h-4 text-[#00A652]" />
              <span>Contenido Documental & Asunto</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                ASUNTO / REFERENCIA OFICIAL <span className="text-red-500">*</span>
              </label>
              <SmartCorrespondenceTextarea
                rows={3}
                placeholder="Ej. SOLICITUD DE REQUERIMIENTO DE MATERIALES Y ADQUISICIÓN DE INSUMOS..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#00A652] uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  CITE OFICIAL
                </label>
                <input
                  type="text"
                  placeholder="Ej. GG-CI N° 012/2026"
                  value={cite}
                  onChange={(e) => setCite(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-[#00A652]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  N° DE FOJAS / PÁGINAS
                </label>
                <input
                  type="number"
                  min={1}
                  value={pageCount}
                  onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-[#00A652]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  PRIORIDAD DEL TRÁMITE
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as RouteSheetPriority)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#00A652]"
                >
                  <option value="NORMAL">NORMAL (5 días SLA)</option>
                  <option value="ALTA">ALTA (3 días SLA)</option>
                  <option value="URGENTE">URGENTE (24 horas SLA)</option>
                  <option value="BAJA">BAJA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                DESCRIPCIÓN DE ANEXOS / ADJUNTOS
              </label>
              <input
                type="text"
                placeholder="Ej. Formulario de Solicitud + 3 Cotizaciones (5 fojas)"
                value={attachmentDescription}
                onChange={(e) => setAttachmentDescription(e.target.value)}
                className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#00A652] uppercase"
              />
            </div>
          </div>

          {/* SECCIÓN 2: DOCUMENTOS ADJUNTOS DIGITALIZADOS (VER Y CAMBIAR) */}
          <div className="bg-slate-50/90 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
                <Paperclip className="w-4 h-4 text-emerald-500" />
                <span>Documentos Adjuntos Digitalizados ({existingDocs.length})</span>
              </div>

              {/* Botón para seleccionar nuevos adjuntos */}
              <button
                type="button"
                onClick={() => newFilesInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar / Adjuntar Archivos</span>
              </button>
            </div>

            {/* Listado de archivos actualmente en el expediente */}
            {existingDocs.length === 0 ? (
              <div className="text-center py-6 px-4 bg-white dark:bg-[#070e0a] rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
                <Paperclip className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Esta Hoja de Ruta no cuenta con archivos adjuntos en el expediente.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Puede adjuntar cartas escaneadas, PDFs, comprobantes o fotos usando la zona de carga inferior.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {existingDocs.map(renderDocumentRow)}
              </div>
            )}

            {/* Zona de Arrastrar y Soltar para Nuevos Archivos */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files) {
                  handleSelectNewFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => newFilesInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                isDraggingOver
                  ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-white/15 hover:border-emerald-500/50 bg-white dark:bg-[#070e0a]/50'
              }`}
            >
              <UploadCloud className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Haga clic aquí o arrastre archivos para agregar o sustituir adjuntos
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Formatos permitidos: PDF, JPG, PNG, DOCX, XLSX (Hasta 50MB)
              </p>
            </div>

            {/* Lista de Nuevos Archivos Seleccionados Pendientes de Subir */}
            {newFiles.length > 0 && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Nuevos archivos por adjuntar ({newFiles.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadInstantPendingFiles}
                    disabled={isUploadingInstant}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>{isUploadingInstant ? 'Subiendo...' : 'Subir ahora'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {newFiles.map((file, idx) => (
                    <div
                      key={`${file.name}_${idx}`}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#070e0a] border border-emerald-500/20 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <span className="text-[9.5px] text-slate-400 font-mono">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • Nuevo
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePendingNewFile(idx);
                        }}
                        title="Quitar de la lista"
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: DATOS DEL REMITENTE */}
          <div className="bg-slate-50/90 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
                <User className="w-4 h-4 text-[#C5A059]" />
                <span>Datos del Remitente</span>
              </div>

              {/* Selector de tipo */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#070e0a] p-1 rounded-xl border border-slate-200 dark:border-white/10">
                {(['AREA_INTERNA', 'SOCIO', 'EXTERNO'] as RouteSheetSenderType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSenderType(t)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      senderType === t
                        ? 'bg-[#00A652] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t === 'AREA_INTERNA' ? 'Interna' : t === 'SOCIO' ? 'Socio' : 'Externa'}

                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  NOMBRE DEL REMITENTE <span className="text-red-500">*</span>
                </label>
                <SmartCorrespondenceInput
                  type="text"
                  placeholder="Ej. María del Pilar Atanacio"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#00A652] uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  ÁREA / INSTITUCIÓN DE PROCEDENCIA
                </label>
                <input
                  type="text"
                  placeholder="Ej. GERENCIA GENERAL o ASESORÍA LEGAL"
                  value={senderArea}
                  onChange={(e) => setSenderArea(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#00A652] uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  TELÉFONO / CELULAR
                </label>
                <input
                  type="text"
                  placeholder="Ej. 70110002"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#00A652]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  CORREO ELECTRÓNICO
                </label>
                <input
                  type="email"
                  placeholder="Ej. remitente@chls.bo"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#00A652]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#00A652] hover:bg-[#009247] text-white font-black flex items-center gap-2 shadow-lg shadow-[#00A652]/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : newFiles.length > 0
                  ? `Guardar y Subir Adjuntos (${newFiles.length})`
                  : 'Guardar Modificaciones'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Submodal Visor Interactivo de Documento Adjunto */}
      {previewDoc && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#07110c] border border-emerald-500/40 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header del Visor */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-black text-sm truncate">{previewDoc.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getDocumentFullUrl(previewDoc.fileUrl)}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-black hover:scale-105 transition-all shadow-md cursor-pointer"
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

            {/* Contenedor del Documento */}
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
                  <Paperclip className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">{previewDoc.fileName}</h4>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                    Este tipo de archivo requiere descargarse para visualizarse en su equipo.
                  </p>
                  <a
                    href={getDocumentFullUrl(previewDoc.fileUrl)}
                    download={previewDoc.fileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
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

export default EditRouteSheetModal;
