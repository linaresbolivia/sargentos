import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { createRouteSheet, uploadRouteSheetDocuments, fetchWorkflowSettings } from '@store/correspondenceSlice';
import {
  X,
  Sparkles,
  Building2,
  User,
  Truck,
  FileText,
  Send,
  Check,
  ShieldAlert,
  Copy,
  Layers,
  Flame,
  Clock,
  Hash,
  Paperclip,
  UploadCloud,
  Trash2,
  FileCheck,
  GitBranch,
  ArrowRight,
  AlertCircle,
  Lock,
  Scan,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';
import { autoCorrectAccents } from '../utils/correspondencePredictiveEngine';
import { getOrganigramDestinations, DEFAULT_ORGANIGRAM_NODES, getOrganigramNodeForUser } from '../utils/organigramWorkflowService';
import { countTotalPdfPages } from '../utils/pdfPageCounter';

interface NewRouteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOriginArea?: string;
}

const CHLS_INTERNAL_AREAS = [
  'SECRETARÍA GENERAL',
  'GERENCIA GENERAL',
  'TESORERÍA Y FINANZAS',
  'CONTRATACIONES Y ADQUISICIONES',
  'COMISIÓN HÍPICA',
  'CAPITANÍA DEPORTES / TENIS',
  'ASESORÍA LEGAL',
  'MANTENIMIENTO Y OBRAS',
  'DIRECTORIO / PRESIDENCIA',
  'ALMACÉN',
  'SISTEMAS E INFORMÁTICA',
  'RECURSOS HUMANOS',
];

const AREA_RESPONSIBLES: Record<string, { title: string; defaultPerson: string }> = {
  'SECRETARÍA GENERAL': { title: 'Secretaría de Gerencia General', defaultPerson: 'María del Pilar Atanacio (Secretaria de Gerencia)' },
  'GERENCIA GENERAL': { title: 'Gerencia General / MAE', defaultPerson: 'Gerente General CHLS' },
  'TESORERÍA Y FINANZAS': { title: 'Jefatura de Tesorería y Finanzas', defaultPerson: 'Jefe de Finanzas & Tesorería' },
  'CONTRATACIONES Y ADQUISICIONES': { title: 'Responsable de Compras & Contrataciones', defaultPerson: 'Encargado de Adquisiciones' },
  'COMISIÓN HÍPICA': { title: 'Capitanía Hípica & Área Ecuestre', defaultPerson: 'Capitán de Comisión Hípica' },
  'CAPITANÍA DEPORTES / TENIS': { title: 'Capitanía de Deportes & Tenis', defaultPerson: 'Capitán de Deportes' },
  'ASESORÍA LEGAL': { title: 'Asesoría Jurídica Institucional', defaultPerson: 'Asesor Legal Principal' },
  'MANTENIMIENTO Y OBRAS': { title: 'Jefatura de Infraestructura y Mantenimiento', defaultPerson: 'Jefe de Mantenimiento' },
  'DIRECTORIO / PRESIDENCIA': { title: 'Directorio / Presidencia CHLS', defaultPerson: 'Directorio CHLS' },
  'ALMACÉN': { title: 'Encargado de Almacén & Suministros', defaultPerson: 'Responsable de Almacén' },
  'SISTEMAS E INFORMÁTICA': { title: 'Jefatura de Sistemas & TI', defaultPerson: 'Administrador de Sistemas' },
  'RECURSOS HUMANOS': { title: 'Jefatura de Talento Humano', defaultPerson: 'Responsable de RRHH' },
};

const QUICK_STAMPS = [
  'FAVOR SU ATENCIÓN Y TRÁMITE',
  'FAVOR REALIZAR EL PAGO',
  'PARA INFORME TÉCNICO / LEGAL',
  'PARA SU CONOCIMIENTO Y FINES',
  'PARA VISTO BUENO / AUTORIZACIÓN',
  'ARCHIVAR ANTECEDENTES',
];

export const NewRouteSheetModal: React.FC<NewRouteSheetModalProps> = ({ isOpen, onClose, defaultOriginArea }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSaving, workflow } = useSelector((state: RootState) => state.correspondence);
  const currentUser = useSelector((state: RootState) => (state as any).auth?.user);

  useEffect(() => {
    if (isOpen && (!workflow || !workflow.nodes || workflow.nodes.length === 0)) {
      dispatch(fetchWorkflowSettings());
    }
  }, [isOpen, workflow, dispatch]);

  const [senderType, setSenderType] = useState<'AREA_INTERNA' | 'SOCIO' | 'EXTERNO'>('AREA_INTERNA');
  const [senderName, setSenderName] = useState('');
  const [senderArea, setSenderArea] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderDoc, setSenderDoc] = useState('');
  const [cite, setCite] = useState('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [filePageCounts, setFilePageCounts] = useState<Record<string, number>>({});
  const [isCountingPages, setIsCountingPages] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [reference, setReference] = useState('');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  const rawNodes = useMemo(() => {
    return (workflow?.nodes && workflow.nodes.length > 0) ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;
  }, [workflow]);

  // Detectar automáticamente el nodo oficial del usuario autenticado en el Organigrama
  const userNode = useMemo(() => {
    return getOrganigramNodeForUser(currentUser, workflow);
  }, [currentUser, workflow]);

  // Despacho que emite el proveído y deriva (fijado por defecto al cargo del usuario logueado)
  const [originDispatch, setOriginDispatch] = useState<string>('');

  useEffect(() => {
    if (isOpen && rawNodes && rawNodes.length > 0) {
      const preferred = defaultOriginArea || userNode?.title || (currentUser as any)?.area || (currentUser as any)?.department || 'GERENCIA GENERAL';
      const matched = rawNodes.find(n => (n.title || '').toUpperCase() === preferred.toUpperCase() || (n.areaKey || '').toUpperCase() === preferred.toUpperCase()) || rawNodes[0];
      setOriginDispatch(matched.title);
    }
  }, [isOpen, rawNodes, defaultOriginArea, userNode, currentUser]);

  const effectiveSourceArea = originDispatch || userNode?.title || defaultOriginArea || 'GERENCIA GENERAL';

  // Compute recommended destinations from active organigram & workflow rules
  const { sourceNode, recommendedNodes, allNodes } = useMemo(() => {
    return getOrganigramDestinations(effectiveSourceArea, workflow);
  }, [effectiveSourceArea, workflow]);

  // Sincronizar senderArea al abrir con un nodo real existente del organigrama
  useEffect(() => {
    if (isOpen && allNodes && allNodes.length > 0) {
      if (!senderArea || !allNodes.some(n => (n.areaKey || n.title).toUpperCase() === senderArea.toUpperCase())) {
        const preferredArea = defaultOriginArea || currentUser?.area || 'GERENCIA GENERAL';
        const matched = allNodes.find(n => (n.title || '').toUpperCase() === preferredArea.toUpperCase() || (n.areaKey || '').toUpperCase() === preferredArea.toUpperCase()) || allNodes[0];
        setSenderArea(matched.areaKey || matched.title);
        if (matched.manager && !senderName) {
          setSenderName(matched.manager);
        }
      }
    }
  }, [isOpen, allNodes, defaultOriginArea, currentUser, senderArea, senderName]);

  // Initial instruction & C.C.
  const [hasInitialInstruction, setHasInitialInstruction] = useState(true);
  const [initialTargetArea, setInitialTargetArea] = useState('');
  const [initialTargetPerson, setInitialTargetPerson] = useState('');
  const [initialCcAreas, setInitialCcAreas] = useState<string[]>([]);
  const [initialCcPersons, setInitialCcPersons] = useState('');
  const [ccSearchQuery, setCcSearchQuery] = useState('');
  const [showCcSelector, setShowCcSelector] = useState(false);
  const [initialQuickStamp, setInitialQuickStamp] = useState('FAVOR SU ATENCIÓN Y TRÁMITE');
  const [initialInstruction, setInitialInstruction] = useState('Favor su atención y trámite correspondiente.');

  // Auto-set initial target EXCLUSIVAMENTE a partir de los destinos conectados en el organigrama
  useEffect(() => {
    if (recommendedNodes && recommendedNodes.length > 0) {
      const validFirst = recommendedNodes.find(
        (r) => (r.node.areaKey || r.node.title).toUpperCase() !== effectiveSourceArea.toUpperCase()
      ) || recommendedNodes[0];
      const targetNode = validFirst.node;
      setInitialTargetArea(targetNode.areaKey || targetNode.title);
      setInitialTargetPerson(targetNode.manager || '');
      if (validFirst.edgeLabel) {
        setInitialInstruction(`Para ${validFirst.edgeLabel.toLowerCase()}: Favor su atención y trámite correspondiente.`);
      }
    } else {
      setInitialTargetArea('');
      setInitialTargetPerson('');
      setInitialInstruction('Favor su atención y trámite correspondiente.');
    }
  }, [effectiveSourceArea, recommendedNodes]);

  const handleSelectRecommendedDestination = (node: any, edgeLabel?: string) => {
    const area = node.areaKey || node.title;
    setInitialTargetArea(area);
    setInitialTargetPerson(node.manager || '');
    if (edgeLabel) {
      setInitialInstruction(`Para ${edgeLabel.toLowerCase()}: `);
    }
    toast.success(`Destino asignado: ${node.title} (${node.manager || 'Titular'})`, {
      icon: '🧭',
      duration: 3000,
    });
  };

  if (!isOpen) return null;

  const processFiles = async (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;

    // Evitar archivos duplicados por nombre y tamaño exacto
    const existingSignatures = new Set(selectedFiles.map((f) => `${f.name}_${f.size}`));
    const filteredNew = newFiles.filter((f) => !existingSignatures.has(`${f.name}_${f.size}`));

    if (filteredNew.length === 0) {
      toast('Estos archivos ya fueron añadidos a la digitalización', { icon: 'ℹ️' });
      return;
    }

    const combined = [...selectedFiles, ...filteredNew];
    setSelectedFiles(combined);
    setIsCountingPages(true);

    const toastId = toast.loading('Digitalizando y contabilizando fojas de los documentos...');
    try {
      const { total, byFile } = await countTotalPdfPages(combined);
      setFilePageCounts(byFile);

      if (total > 0) {
        setPageCount(total);
        toast.success(
          `Digitalización completada: se contabilizaron ${total} ${total === 1 ? 'foja' : 'fojas'} automáticamente`,
          { id: toastId, icon: '📑' }
        );
      } else {
        toast.dismiss(toastId);
      }
    } catch (err) {
      console.warn('Error counting pages on new route sheet upload:', err);
      toast.dismiss(toastId);
    } finally {
      setIsCountingPages(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);

    if (updated.length === 0) {
      setFilePageCounts({});
      setPageCount(1);
      return;
    }

    setIsCountingPages(true);
    try {
      const { total, byFile } = await countTotalPdfPages(updated);
      setFilePageCounts(byFile);
      setPageCount(total > 0 ? total : 1);
    } catch {
      // ignore
    } finally {
      setIsCountingPages(false);
    }
  };

  const handleRecalculatePages = async () => {
    if (selectedFiles.length === 0) return;
    setIsCountingPages(true);
    const toastId = toast.loading('Recalculando fojas de los documentos adjuntos...');
    try {
      const { total, byFile } = await countTotalPdfPages(selectedFiles);
      setFilePageCounts(byFile);
      setPageCount(total > 0 ? total : 1);
      toast.success(`Fojas recalculadas: ${total} ${total === 1 ? 'foja' : 'fojas'}`, { id: toastId, icon: '📄' });
    } catch {
      toast.error('No se pudo recalcular el número de fojas', { id: toastId });
    } finally {
      setIsCountingPages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senderName.trim()) {
      toast.error('Por favor ingresa el nombre de quien remite');
      return;
    }

    if (!reference.trim()) {
      toast.error('Por favor ingresa el asunto o referencia');
      return;
    }

    if (hasInitialInstruction && (!initialTargetArea.trim() || recommendedNodes.length === 0)) {
      toast.error('No se puede radicar con derivación: el área no tiene conexiones autorizadas en el Organigrama.');
      return;
    }

    const payload = {
      senderType,
      senderName: senderName.trim(),
      senderArea: senderType === 'AREA_INTERNA' ? senderArea : null,
      senderPhone: senderPhone.trim() || null,
      senderEmail: senderEmail.trim() || null,
      senderDoc: senderDoc.trim() || null,
      cite: cite.trim() || null,
      pageCount: Number(pageCount) || 1,
      reference: reference.trim(),
      attachmentDescription: attachmentDescription.trim() || null,
      priority,
      initialArea: initialTargetArea,
      initialInstruction: hasInitialInstruction ? initialInstruction.trim() : null,
      initialTargetPerson: hasInitialInstruction ? initialTargetPerson.trim() : null,
      initialQuickStamp: hasInitialInstruction ? initialQuickStamp : null,
      initialCcAreas: hasInitialInstruction ? initialCcAreas : [],
      initialCcPersons: hasInitialInstruction ? initialCcPersons.trim() || null : null,
      aiSummary: null,
      suggestedArea: null,
    };

    const action = await dispatch(createRouteSheet(payload));
    if (createRouteSheet.fulfilled.match(action)) {
      const createdItem = action.payload;

      // Upload digitized files if any
      if (selectedFiles.length > 0) {
        setIsUploadingDocs(true);
        try {
          await dispatch(
            uploadRouteSheetDocuments({
              routeSheetId: createdItem.id,
              files: selectedFiles,
            })
          );
        } catch {
          toast.error('Hoja de ruta creada, pero hubo un error al subir los archivos adjuntos.');
        } finally {
          setIsUploadingDocs(false);
        }
      }

      toast.success(
        `Hoja de Ruta ${createdItem.hrCode} creada y digitalizada (${selectedFiles.length} doc${selectedFiles.length === 1 ? '' : 's'}) 🎉`
      );
      onClose();
    } else {
      toast.error('Error al generar la Hoja de Ruta');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-lg flex justify-center items-center p-2 sm:p-4 lg:p-6 animate-fadeIn">
      <div className="bg-[#f8fafc] dark:bg-[#07110c] border-2 border-emerald-500/40 w-full max-w-[1680px] h-[94vh] rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.25)] overflow-hidden flex flex-col justify-between">
        
        {/* Top Header Command Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-emerald-500/30 flex justify-between items-center bg-white/90 dark:bg-[#091810] shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide">
                  NUEVA HOJA DE RUTA
                </h1>
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  Radicación 360°
                </span>
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                  Cero Papel
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold mt-0.5">
                Club Hípico Los Sargentos — Despacho Radicador: {sourceNode?.title || effectiveSourceArea}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Body in 2 Majestic Columns */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 flex flex-col justify-between space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ========================================================================= */}
            {/* COLUMNA IZQUIERDA: REMITENTE Y ASUNTO (6 de 12) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* 1. SECCIÓN: TIPO & DATOS DEL REMITENTE */}
              <div className="bg-white/95 dark:bg-[#0c1a13] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-lg shadow-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                      1
                    </div>
                    <h2 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Origen & Remitente
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                    Paso 1 de 2
                  </span>
                </div>

                {/* Segmented Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-2">
                    Tipo de Procedencia
                  </label>
                  <div className="grid grid-cols-3 gap-2.5 bg-slate-100 dark:bg-black/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSenderType('AREA_INTERNA');
                        if (!senderArea) {
                          setSenderArea(defaultOriginArea || (currentUser as any)?.area || 'GERENCIA GENERAL');
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                        senderType === 'AREA_INTERNA'
                          ? 'bg-white dark:bg-[#152e20] text-emerald-900 dark:text-emerald-300 shadow-md border-2 border-emerald-500/50'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Área Interna</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSenderType('SOCIO'); setSenderArea(''); }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                        senderType === 'SOCIO'
                          ? 'bg-white dark:bg-[#152e20] text-brand-gold shadow-md border-2 border-brand-gold/50'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <User className="w-4 h-4 text-brand-gold" />
                      <span>Socio / Familiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSenderType('EXTERNO'); setSenderArea(''); }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                        senderType === 'EXTERNO'
                          ? 'bg-white dark:bg-[#152e20] text-blue-700 dark:text-blue-300 shadow-md border-2 border-blue-500/50'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <span>Courier / Externo</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Remitente Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {senderType === 'AREA_INTERNA' ? (
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                        Área / Departamento Remitente
                      </label>
                      <select
                        value={senderArea}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSenderArea(val);
                          const matched = allNodes.find(n => (n.areaKey || n.title).toUpperCase() === val.toUpperCase());
                          if (matched && matched.manager && !senderName) {
                            setSenderName(matched.manager);
                          }
                        }}
                        className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-black text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm cursor-pointer"
                      >
                        {allNodes.map((a) => (
                          <option key={a.id} value={a.areaKey || a.title}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                        {senderType === 'SOCIO' ? 'N° de Acción / CI' : 'Empresa / Institución Externa'}
                      </label>
                      <input
                        type="text"
                        placeholder={senderType === 'SOCIO' ? 'Ej. Acción 142 o 4892110 LP' : 'Ej. DELAPAZ, EPSAS, Banco Bisa'}
                        value={senderDoc}
                        onChange={(e) => setSenderDoc(e.target.value)}
                        className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                      Nombre Completo del Remitente <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza o María del Pilar"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                      Teléfono / WhatsApp de Contacto (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 77218940"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200">
                        Correo Electrónico (Notificación)
                      </label>
                      <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-bold">
                        Acuse Digital
                      </span>
                    </div>
                    <input
                      type="email"
                      placeholder="Ej. socio@gmail.com o empresa@proveedor.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                      Prioridad del Trámite
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['NORMAL', 'ALTA', 'URGENTE'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                            priority === p
                              ? p === 'URGENTE'
                                ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/30'
                                : p === 'ALTA'
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                                : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                              : 'bg-slate-100 dark:bg-black/40 text-slate-700 dark:text-gray-400 border-slate-300 dark:border-white/10 hover:bg-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. SECCIÓN: ASUNTO & DOCUMENTO DE ORIGEN */}
              <div className="bg-white dark:bg-[#0c1a13] border-2 border-slate-200 dark:border-emerald-500/30 rounded-3xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase tracking-wider">
                      Asunto & Documento de Origen
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                      CITE / N° de Nota o Informe
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. ALM-INF N° 42/2026"
                      value={cite}
                      onChange={(e) => setCite(e.target.value)}
                      className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>N° de Fojas / Folios</span>
                        <span className="text-red-500 text-sm">*</span>
                      </span>
                      {isCountingPages ? (
                        <span className="text-[9px] font-black uppercase text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded-full border border-brand-gold/40 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-brand-gold" />
                          <span>Contabilizando...</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{selectedFiles.length > 0 ? `Auto: ${pageCount} ${pageCount === 1 ? 'foja' : 'fojas'} (Inalterable)` : 'Automático'}</span>
                        </span>
                      )}
                    </label>
                    <div className="relative group">
                      {isCountingPages ? (
                        <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gold animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <input
                        type="number"
                        min="1"
                        value={pageCount}
                        readOnly={true}
                        tabIndex={-1}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-100/90 dark:bg-[#06100b] border-2 rounded-2xl text-slate-950 dark:text-emerald-300 font-mono font-black text-sm outline-none shadow-sm cursor-not-allowed select-none transition-all ${
                          isCountingPages
                            ? 'border-brand-gold/60 ring-2 ring-brand-gold/20'
                            : 'border-emerald-500/40 bg-emerald-500/5'
                        }`}
                        title="Cantidad inalterable: El número de fojas se calcula y bloquea de manera 100% automática a partir de los documentos digitalizados."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-950 dark:text-white">Referencia / Asunto Principal</span>
                      <span className="text-red-500 text-sm">*</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <Sparkles className="w-3 h-3 text-emerald-600 dark:text-brand-gold" />
                      <span>Corrector ortográfico & Predicción activa</span>
                    </span>
                  </label>
                  <SmartCorrespondenceTextarea
                    rows={3}
                    placeholder="EJ. SOLICITUD DE ADQUISICIÓN DE ARENA Y MANTENIMIENTO PARA PISTAS DE SALTO HÍPICO"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    enablePrediction={true}
                    enableQuickPhrases={true}
                    className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-4 text-slate-950 dark:text-white font-black uppercase text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm leading-relaxed placeholder:text-slate-400 dark:placeholder:text-gray-500 placeholder:normal-case placeholder:font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                    <span className="text-slate-950 dark:text-white">Descripción de Documentos Adjuntos / Anexos</span>
                  </label>
                  <SmartCorrespondenceInput
                    placeholder="Ej. Formulario de Requerimiento + 3 Cotizaciones de Proveedores (5 fojas)"
                    value={attachmentDescription}
                    onChange={(e) => setAttachmentDescription(e.target.value)}
                    className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  />
                </div>

                {/* Digitalización & Carga de Archivos (Eco-Híbrido) */}
                <div className="pt-2 border-t border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Digitalizar & Adjuntar Archivos (PDF, Fotos, Comprobantes)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        Eco-Híbrido Cero Papel
                      </span>
                      {selectedFiles.length > 0 && (
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                          {pageCount} {pageCount === 1 ? 'foja digital' : 'fojas digitales'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dropzone Container con Drag-and-Drop nativo */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        await processFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all text-center group cursor-pointer ${
                      isDraggingOver
                        ? 'border-brand-gold bg-brand-gold/15 scale-[1.01] shadow-[0_0_20px_rgba(204,161,75,0.25)]'
                        : 'border-emerald-500/40 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title="Haz clic o arrastra documentos aquí"
                    />

                    {isCountingPages ? (
                      <div className="flex flex-col items-center py-2 animate-pulse">
                        <Loader2 className="w-8 h-8 text-brand-gold animate-spin mb-2" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Digitalizando y contabilizando fojas automáticamente...
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                          Analizando estructura de páginas de los documentos
                        </span>
                      </div>
                    ) : isDraggingOver ? (
                      <div className="flex flex-col items-center py-2">
                        <UploadCloud className="w-9 h-9 text-brand-gold animate-bounce mb-1" />
                        <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                          ¡Suelta los archivos aquí para digitalizarlos y contar sus fojas!
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-brand-gold" />
                          </div>
                          <div className="p-2 rounded-xl bg-brand-gold/15 border border-brand-gold/30 group-hover:scale-110 transition-transform">
                            <Scan className="w-5 h-5 text-brand-gold" />
                          </div>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Arrastra archivos aquí o <span className="text-emerald-700 dark:text-brand-gold underline decoration-emerald-500/50">haz clic para examinar</span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 max-w-md">
                          Soporta PDF escaneados, imágenes de comprobantes, Word y Excel. <strong className="text-emerald-700 dark:text-emerald-400">Conteo automático de fojas integrado.</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Preview Selected Files Chips */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-gray-400">
                          Archivos digitalizados ({selectedFiles.length}) — Total: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{pageCount} {pageCount === 1 ? 'foja' : 'fojas'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleRecalculatePages}
                          disabled={isCountingPages}
                          className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className={`w-3 h-3 ${isCountingPages ? 'animate-spin' : ''}`} />
                          <span>Recontar fojas</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => {
                          const pages = filePageCounts[file.name] || 1;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-emerald-500/40 text-xs font-bold text-slate-900 dark:text-gray-200 shadow-xs hover:border-emerald-500 transition-colors"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[180px]" title={file.name}>{file.name}</span>
                              <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                {pages} {pages === 1 ? 'foja' : 'fojas'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors ml-1 p-0.5 cursor-pointer"
                                title="Quitar archivo digitalizado"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* COLUMNA DERECHA: PROVEÍDO, DESTINO Y CON COPIA (6 de 12) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-6 space-y-5">
              
              <div className="bg-white/95 dark:bg-[#0c1a13] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-lg shadow-emerald-950/20 space-y-4">
                
                {/* Header de Sección 3 */}
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                      3
                    </div>
                    <h2 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Primer Proveído / Derivación Inmediata
                    </h2>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                    <input
                      type="checkbox"
                      checked={hasInitialInstruction}
                      onChange={(e) => setHasInitialInstruction(e.target.checked)}
                      className="rounded w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Derivar de Inmediato</span>
                  </label>
                </div>

                {hasInitialInstruction ? (
                  <div className="space-y-4">
                    
                    {/* Alerta en caso de no tener conexiones autorizadas en el Organigrama */}
                    {recommendedNodes.length === 0 && (
                      <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <div>
                          <span className="font-black block">Sin líneas de derivación autorizadas:</span>
                          <span className="text-[11px] text-red-600 dark:text-red-400">
                            {effectiveSourceArea} no tiene conectores salientes en el Organigrama 360°. Para autorizar destinos, traza sus líneas en <em>Organigrama & Flujos</em>.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Destino y Funcionario */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                          Área de Destino Principal <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={initialTargetArea}
                          onChange={(e) => {
                            const newArea = e.target.value;
                            setInitialTargetArea(newArea);
                            const matchedNode = allNodes.find(
                              (n) => (n.areaKey || n.title).toUpperCase() === newArea.toUpperCase()
                            );
                            if (matchedNode && matchedNode.manager) {
                              setInitialTargetPerson(matchedNode.manager);
                            } else if (AREA_RESPONSIBLES[newArea]) {
                              setInitialTargetPerson(AREA_RESPONSIBLES[newArea].defaultPerson);
                            }
                          }}
                          className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-black text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm cursor-pointer"
                        >
                          {recommendedNodes.length > 0 ? (
                            <optgroup label="⭐ Destinos Conectados en el Organigrama">
                              {recommendedNodes.map(({ node, edgeLabel }) => (
                                <option key={node.id} value={node.areaKey || node.title}>
                                  ⭐ {node.title} {edgeLabel ? `(${edgeLabel})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          ) : (
                            <option value="" disabled>
                              ⛔ Sin conexiones autorizadas en el Organigrama
                            </option>
                          )}
                        </select>
                        {recommendedNodes.length === 0 && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1.5 flex items-center gap-1">
                            <span>⚠️ {effectiveSourceArea} no tiene conectores salientes en el Canvas 360°.</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200">
                            Responsable / Jefatura de Despacho
                          </label>
                          <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-black">
                            Titular
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Ej. Ian Pinto / Laura Ríos"
                          value={initialTargetPerson}
                          onChange={(e) => setInitialTargetPerson(e.target.value)}
                          className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    {/* CON COPIA A (C.C. INFORMATIVO INTELIGENTE) */}
                    <div className="bg-slate-100/80 dark:bg-[#060e0a] p-4 rounded-2xl border-2 border-slate-200 dark:border-emerald-500/20 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200 flex items-center gap-2">
                          <Copy className="w-4 h-4 text-brand-gold" />
                          <span>Con Copia a (C.C. Informativo):</span>
                        </label>
                        <div className="flex items-center gap-2">
                          {initialCcAreas.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setInitialCcAreas([])}
                              className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              Limpiar copias ({initialCcAreas.length})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowCcSelector(!showCcSelector)}
                            className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{showCcSelector ? '▲ Ocultar Selector' : '+ Agregar Copias Institucionales'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Áreas seleccionadas en C.C. (Badges dorados compactos) */}
                      {initialCcAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-950/20 rounded-xl border border-emerald-500/30">
                          {initialCcAreas.map((areaTitle) => (
                            <span
                              key={areaTitle}
                              className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-lg bg-brand-gold text-slate-950 shadow-sm animate-fadeIn"
                            >
                              <span>📋 {areaTitle}</span>
                              <button
                                type="button"
                                onClick={() => setInitialCcAreas((prev) => prev.filter((a) => a !== areaTitle))}
                                className="w-4 h-4 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-[10px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Selector desplegable con buscador de Áreas */}
                      {showCcSelector && (
                        <div className="p-3 bg-white dark:bg-black/60 rounded-xl border border-emerald-500/30 space-y-2 animate-fadeIn">
                          <input
                            type="text"
                            placeholder="🔍 Escribe para filtrar cargos y departamentos..."
                            value={ccSearchQuery}
                            onChange={(e) => setCcSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#07110c] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                            {allNodes
                              .filter((n) => {
                                const title = (n.areaKey || n.title).toUpperCase();
                                const isDest = title === initialTargetArea.toUpperCase();
                                if (isDest) return false;
                                if (!ccSearchQuery.trim()) return true;
                                return title.includes(ccSearchQuery.toUpperCase());
                              })
                              .map((node) => {
                                const areaTitle = node.areaKey || node.title;
                                const isSelected = initialCcAreas.includes(areaTitle);
                                return (
                                  <button
                                    key={node.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setInitialCcAreas((prev) => prev.filter((a) => a !== areaTitle));
                                      } else {
                                        setInitialCcAreas((prev) => [...prev, areaTitle]);
                                      }
                                    }}
                                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black scale-[1.02]'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10 hover:border-emerald-500 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>{isSelected ? '✓' : '+'}</span>
                                    <span className="truncate max-w-[220px]">{node.title}</span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      <div>
                        <input
                          type="text"
                          placeholder="Personas o entidades externas en C.C. (ej. Asesoría Legal Externa, Auditoría)"
                          value={initialCcPersons}
                          onChange={(e) => setInitialCcPersons(e.target.value)}
                          className="w-full bg-white dark:bg-[#07110c] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-950 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* SELLOS RÁPIDOS INSTITUCIONALES */}
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-2">
                        Sellos Rápidos de Instrucción (1 Toque)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {QUICK_STAMPS.map((stamp) => {
                          const isCurrent = initialQuickStamp === stamp;
                          return (
                            <button
                              key={stamp}
                              type="button"
                              onClick={() => {
                                setInitialQuickStamp(stamp);
                                setInitialInstruction(stamp + ': Favor proceder conforme a reglamento.');
                              }}
                              className={`text-xs font-black p-2.5 rounded-xl border transition-all text-center leading-snug cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 scale-[1.02]'
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500 hover:bg-slate-100'
                              }`}
                            >
                              {stamp}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* INSTRUCCIÓN / PROVEÍDO TEXTO */}
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                        <span className="text-slate-950 dark:text-white">Instrucción Oficial / Proveído Detallado <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-brand-gold" />
                          <span>Predictivo & Fórmulas oficiales</span>
                        </span>
                      </label>
                      <SmartCorrespondenceTextarea
                        rows={3}
                        value={initialInstruction}
                        onChange={(e) => setInitialInstruction(e.target.value)}
                        required
                        enablePrediction={true}
                        enableQuickPhrases={true}
                        placeholder="Redacta la instrucción formal para el área de destino..."
                        className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-4 text-slate-950 dark:text-white font-medium text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm leading-relaxed placeholder:text-slate-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 dark:text-gray-500 text-xs">
                    El documento se radicará sin derivación inicial inmediata (quedará pendiente en Secretaría General).
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* BARRA INFERIOR DE ACCIÓN (FOOTER COMMAND BAR) */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t-2 border-emerald-500/30 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-transparent rounded-2xl p-3">
            
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-gray-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Radicación activa para: <strong>{senderType === 'AREA_INTERNA' ? senderArea : senderName || 'Nuevo Remitente'}</strong></span>
              <span>• Fojas: <strong>{pageCount}</strong></span>
              <span>• Prioridad: <strong className="text-brand-gold">{priority}</strong></span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 rounded-2xl font-bold text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-5 h-5 text-slate-950" />
                <span>{isSaving ? 'Generando Hoja de Ruta...' : 'Generar Hoja de Ruta Oficial 360°'}</span>
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
};
export default NewRouteSheetModal;
