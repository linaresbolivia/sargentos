import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import {
  createRouteSheet,
  uploadRouteSheetDocuments,
  fetchWorkflowSettings,
  fetchRouteSheets,
  fetchCorrespondenceStats,
  fetchRouteSheetById,
} from '@store/correspondenceSlice';
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
  Search,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';
import GenerateCiteModal from './GenerateCiteModal';
import DestinationSearchCombobox from './DestinationSearchCombobox';
import InternalSenderSearchCombobox from './InternalSenderSearchCombobox';
import CcSearchCombobox from './CcSearchCombobox';
import CiteSearchCombobox from './CiteSearchCombobox';
import SelectCiteModal from './SelectCiteModal';
import { OfficialCiteItem } from '../types/cite.types';
import { citeService } from '../services/citeService';
import { autoCorrectAccents } from '../utils/correspondencePredictiveEngine';
import { getOrganigramDestinations, DEFAULT_ORGANIGRAM_NODES, getOrganigramNodeForUser, canUserAccess360, canUserCreateRouteSheet } from '../utils/organigramWorkflowService';
import { countTotalPdfPages } from '../utils/pdfPageCounter';
import { RouteSheetItem } from '../types/correspondence.types';

interface NewRouteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOriginArea?: string;
  onCreated?: (item: RouteSheetItem) => void;
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

export const NewRouteSheetModal: React.FC<NewRouteSheetModalProps> = ({
  isOpen,
  onClose,
  defaultOriginArea,
  onCreated,
}) => {
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
  const [isGenerateCiteOpen, setIsGenerateCiteOpen] = useState(false);
  const [selectedCite, setSelectedCite] = useState<OfficialCiteItem | null>(null);
  const [isSelectCiteModalOpen, setIsSelectCiteModalOpen] = useState(false);
  const [pendingCitesCount, setPendingCitesCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      citeService.listCites({ unlinkedOnly: true, limit: 1 }).then((res) => {
        setPendingCitesCount(res.total || 0);
      }).catch(() => {});
    } else {
      setSelectedCite(null);
    }
  }, [isOpen]);

  const rawNodes = useMemo(() => {
    return (workflow?.nodes && workflow.nodes.length > 0) ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;
  }, [workflow]);

  // Detectar automáticamente el nodo oficial del usuario autenticado en el Organigrama
  const userNode = useMemo(() => {
    return getOrganigramNodeForUser(currentUser, workflow);
  }, [currentUser, workflow]);

  const canAccess360 = useMemo(() => {
    return canUserAccess360(currentUser, userNode);
  }, [currentUser, userNode]);

  const canCreate = useMemo(() => {
    return canUserCreateRouteSheet(currentUser, userNode);
  }, [currentUser, userNode]);

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
        const newArea = matched.areaKey || matched.title;
        setSenderArea(newArea);
        const official = matched.manager || AREA_RESPONSIBLES[newArea]?.defaultPerson || AREA_RESPONSIBLES[matched.title]?.defaultPerson || '';
        if (official && !senderName) {
          setSenderName(official);
        }
      }
    }
  }, [isOpen, allNodes, defaultOriginArea, currentUser, senderArea, senderName]);

  const handleSelectInternalSender = (area: string, official: string) => {
    setSenderArea(area);
    if (official) {
      setSenderName(official);
    }
    toast.success(`Remitente: ${area}${official ? ` (${official})` : ''}`, {
      icon: '🏛️',
      duration: 2500,
    });
  };

  const handleSelectCite = (citeItem: OfficialCiteItem) => {
    setSelectedCite(citeItem);
    setCite(citeItem.citeCode);

    // 1. Asunto / Referencia
    if (citeItem.subject) {
      setReference(citeItem.subject.toUpperCase());
    }

    // 2. Procedencia y Remitente (Paso 1)
    setSenderType('AREA_INTERNA');

    // Buscar coincidencia en nodos del organigrama institucional
    if (allNodes && allNodes.length > 0) {
      const matchedNode = allNodes.find((n) => {
        const t = (n.title || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const a = (n.areaKey || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const targetKey = (citeItem.areaKey || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const targetName = (citeItem.areaName || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return a === targetKey || t.includes(targetName) || targetName.includes(t) || t.includes(targetKey);
      });

      if (matchedNode) {
        setSenderArea(matchedNode.areaKey || matchedNode.title);
        setSenderName(citeItem.senderName || matchedNode.manager || '');
      } else {
        setSenderArea(citeItem.areaName);
        setSenderName(citeItem.senderName);
      }
    } else {
      setSenderArea(citeItem.areaName);
      setSenderName(citeItem.senderName);
    }

    toast.success(
      `CITE ${citeItem.citeCode} vinculado: Área "${citeItem.areaName}" y asunto autocompletados.`,
      { icon: '📋', duration: 4000 }
    );
  };

  const handleClearCite = () => {
    setSelectedCite(null);
    setCite('');
  };

  // Initial instruction & C.C. (derivaciones siempre inmediatas)
  const [initialTargetArea, setInitialTargetArea] = useState('');
  const [initialTargetPerson, setInitialTargetPerson] = useState('');
  const [allowExtraordinaryDerivation, setAllowExtraordinaryDerivation] = useState(false);
  const [initialCcAreas, setInitialCcAreas] = useState<string[]>([]);
  const [initialQuickStamp, setInitialQuickStamp] = useState<string>('');
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

  if (!canCreate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#071812] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Acceso Restringido</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
            Por normativa y directriz institucional del Club Hípico Los Sargentos, la creación y radicación de Hojas de Ruta está reservada exclusivamente para <strong>Gerencia General</strong> y <strong>Secretaría de Gerencia</strong>.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-950 text-white dark:text-emerald-200 border border-slate-700 dark:border-emerald-800/60 font-bold text-xs hover:bg-slate-800 dark:hover:bg-emerald-900 transition-all cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      </div>
    );
  }

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

    if (!canCreate) {
      toast.error('Acceso denegado: Solo Gerencia General y Secretaría de Gerencia pueden emitir Hojas de Ruta.');
      return;
    }

    if (senderType === 'AREA_INTERNA' && !senderArea.trim()) {
      toast.error('Por favor selecciona el Área o Departamento remitente');
      return;
    }

    if (!senderName.trim()) {
      toast.error(senderType === 'AREA_INTERNA' ? 'Por favor selecciona el área o indica el funcionario remitente' : 'Por favor ingresa el nombre de quien remite');
      return;
    }

    if (!reference.trim()) {
      toast.error('Por favor ingresa el asunto o referencia');
      return;
    }

    if (!initialTargetArea.trim() || recommendedNodes.length === 0) {
      toast.error('Debes seleccionar un área de destino autorizada para la derivación inmediata.');
      return;
    }

    const payload = {
      senderType,
      senderName: senderName.trim(),
      senderArea: senderType === 'AREA_INTERNA' ? senderArea : null,
      senderPhone: senderType === 'AREA_INTERNA' ? null : (senderPhone.trim() || null),
      senderEmail: senderType === 'AREA_INTERNA' ? null : (senderEmail.trim() || null),
      senderDoc: senderDoc.trim() || null,
      cite: cite.trim() || null,
      citeId: selectedCite?.id || null,
      pageCount: Number(pageCount) || 1,
      reference: reference.trim(),
      attachmentDescription: attachmentDescription.trim() || null,
      priority,
      initialArea: initialTargetArea,
      initialInstruction: initialInstruction.trim() || 'Favor su atención y trámite correspondiente.',
      initialTargetPerson: initialTargetPerson.trim() || null,
      initialQuickStamp: initialQuickStamp.trim() ? initialQuickStamp.trim() : null,
      initialCcAreas: initialCcAreas,
      initialCcPersons: null,
      sourceArea: effectiveSourceArea,
      aiSummary: null,
      suggestedArea: null,
    };

    const action = await dispatch(createRouteSheet(payload));
    if (createRouteSheet.fulfilled.match(action)) {
      let createdItem = action.payload;

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

      // Obtener el objeto enriquecido actualizado completo para asegurar que todos los datos y movimientos estén presentes
      try {
        const freshRes = await dispatch(fetchRouteSheetById(createdItem.id));
        if (fetchRouteSheetById.fulfilled.match(freshRes)) {
          createdItem = freshRes.payload;
        }
      } catch {
        // En caso de contingencia se usa createdItem
      }

      await dispatch(fetchRouteSheets());
      dispatch(fetchCorrespondenceStats());

      toast.success(
        `Hoja de Ruta ${createdItem.hrCode} creada exitosamente. Abriendo para impresión...`,
        { icon: '🖨️' }
      );
      onClose();
      onCreated?.(createdItem);
    } else {
      toast.error('Error al generar la Hoja de Ruta');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-lg flex justify-center items-center p-2 sm:p-4 lg:p-6 animate-fadeIn">
      <div className="bg-slate-50 dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/40 w-full max-w-[1680px] h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between">
        
        {/* Top Header Command Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-slate-200 dark:border-emerald-800/40 flex justify-between items-center bg-white/80 dark:bg-[#07130E] shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-emerald-500/10 dark:bg-[#091A14] border border-emerald-500/25">
              <CrestLogo size="sm" className="w-10 h-10 shrink-0 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  NUEVA HOJA DE RUTA
                </h1>
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Radicación 360°
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Cero Papel
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-emerald-400/70 font-medium mt-0.5">
                Club Hípico Los Sargentos — Despacho Radicador: {sourceNode?.title || effectiveSourceArea}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sequence Flow Bar (Lectura natural de izquierda a derecha 1 -> 2 -> 3) */}
        <div className="px-6 sm:px-8 py-2.5 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                1
              </div>
              <span className="font-bold text-slate-800 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                Origen & Remitente
              </span>
            </div>

            <div className="flex-1 mx-3 sm:mx-6 flex items-center">
              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500/50 via-emerald-500/30 to-blue-500/40" />
              <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0 -ml-1" />
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                2
              </div>
              <span className="font-bold text-slate-800 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                Asunto & Documento
              </span>
            </div>

            <div className="flex-1 mx-3 sm:mx-6 flex items-center">
              <div className="h-0.5 w-full bg-gradient-to-r from-blue-500/50 via-blue-500/30 to-amber-500/40" />
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 -ml-1" />
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#C5A059] text-slate-950 font-bold text-xs flex items-center justify-center shadow-xs">
                3
              </div>
              <span className="font-bold text-slate-800 dark:text-[#E2C785] uppercase tracking-wider text-[11px]">
                Primer Proveído / Derivación
              </span>
            </div>
          </div>
        </div>

        {/* Form Body in 3 Majestic Symmetrical Columns */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between space-y-5">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch flex-1">
            
            {/* ========================================================================= */}
            {/* COLUMNA 1: ORIGEN & REMITENTE (Paso 1 de 3) - Tono Verde Bebé Pastel */}
            {/* ========================================================================= */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Origen & Remitente
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Paso 1 de 3
                  </span>
                </div>

                {/* Segmented Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Tipo de Procedencia
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSenderType('AREA_INTERNA');
                        setSenderPhone('');
                        setSenderEmail('');
                        if (!senderArea) {
                          const preferredArea = defaultOriginArea || (currentUser as any)?.area || 'GERENCIA GENERAL';
                          const matched = allNodes.find(n => (n.title || '').toUpperCase() === preferredArea.toUpperCase() || (n.areaKey || '').toUpperCase() === preferredArea.toUpperCase()) || allNodes[0];
                          const newArea = matched?.areaKey || matched?.title || 'GERENCIA GENERAL';
                          setSenderArea(newArea);
                          const official = matched?.manager || AREA_RESPONSIBLES[newArea]?.defaultPerson || AREA_RESPONSIBLES[matched?.title]?.defaultPerson || '';
                          if (official) setSenderName(official);
                        } else {
                          const matched = allNodes.find(n => (n.areaKey || n.title).toUpperCase() === senderArea.toUpperCase());
                          const official = matched?.manager || AREA_RESPONSIBLES[senderArea]?.defaultPerson || '';
                          if (official && !senderName) setSenderName(official);
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        senderType === 'AREA_INTERNA'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span className="truncate">Área Interna</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSenderType('SOCIO');
                        setSenderArea('');
                        setSenderName('');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        senderType === 'SOCIO'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-[#E2C785] shadow-xs border border-slate-300 dark:border-slate-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span className="truncate">Socio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSenderType('EXTERNO');
                        setSenderArea('');
                        setSenderName('');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        senderType === 'EXTERNO'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span className="truncate">Courier</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Remitente Fields */}
                {senderType === 'AREA_INTERNA' ? (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Área Remitente</span>
                          <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                          <Search className="w-2.5 h-2.5 text-emerald-500" />
                          <span>Motor 360°</span>
                        </span>
                      </label>
                      <InternalSenderSearchCombobox
                        selectedArea={senderArea}
                        selectedOfficial={senderName}
                        workflow={workflow}
                        nodes={allNodes}
                        onSelect={handleSelectInternalSender}
                        getResponsibleForArea={(cargo) => {
                          const matched = allNodes.find(
                            (n) => (n.areaKey || n.title).toUpperCase() === cargo.toUpperCase()
                          );
                          if (matched && matched.manager) return matched.manager;
                          if (AREA_RESPONSIBLES[cargo]) return AREA_RESPONSIBLES[cargo].defaultPerson;
                          return '';
                        }}
                        placeholder="Buscar área o funcionario remitente..."
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Nombre del Funcionario Remitente</span>
                          <span className="text-red-500">*</span>
                        </label>
                        {senderName && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                            <span>Autocompletado</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Nombre completo del funcionario remitente"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        required
                        className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3.5 py-2.5 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
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
                            className={`py-2 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                              priority === p
                                ? p === 'URGENTE'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs'
                                  : p === 'ALTA'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                        {senderType === 'SOCIO' ? 'N° de Acción / CI' : 'Empresa / Institución Externa'}
                      </label>
                      <input
                        type="text"
                        placeholder={senderType === 'SOCIO' ? 'Ej. Acción 142 o 4892110 LP' : 'Ej. DELAPAZ, EPSAS, Banco Bisa'}
                        value={senderDoc}
                        onChange={(e) => setSenderDoc(e.target.value)}
                        className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3.5 py-2.5 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                      />
                    </div>

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
                        className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3.5 py-2.5 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200 mb-1.5">
                          Teléfono / WhatsApp
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 77218940"
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3 py-2 text-slate-950 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black uppercase text-slate-900 dark:text-gray-200">
                            Correo
                          </label>
                          <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-bold">
                            Acuse
                          </span>
                        </div>
                        <input
                          type="email"
                          placeholder="socio@gmail.com"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          className="w-full bg-white dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3 py-2 text-slate-950 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-gray-500"
                        />
                      </div>
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
                            className={`py-2 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                              priority === p
                                ? p === 'URGENTE'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs'
                                  : p === 'ALTA'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Helper for Column 1 */}
              <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3 mt-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {senderType === 'AREA_INTERNA' ? 'Procedencia Institucional' : 'Remitente Registrado'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                    {senderType === 'AREA_INTERNA' 
                      ? 'Circula directamente por despachos del organigrama oficial.'
                      : 'Se emitirá acuse de recibo con código de seguimiento único.'}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* COLUMNA 2: ASUNTO & DOCUMENTO DE ORIGEN (Paso 2 de 3) - Tono Celeste Bebé Pastel */}
            {/* ========================================================================= */}
            <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-800/40 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-sky-200/60 dark:border-sky-800/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-500/25 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Asunto & Documento
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                    Paso 2 de 3
                  </span>
                </div>

                {/* CITE y Fojas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>CITE / N° Nota</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsSelectCiteModalOpen(true)}
                          className="text-[10px] font-bold text-sky-700 dark:text-sky-300 hover:text-sky-600 flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/30 hover:bg-sky-500/20 transition-all cursor-pointer shadow-xs"
                          title="Explorar y seleccionar CITEs creados por los usuarios en el sistema"
                        >
                          <BookOpen className="w-2.5 h-2.5 text-sky-400" />
                          <span>CITEs de Usuarios</span>
                          {pendingCitesCount > 0 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-extrabold animate-pulse">
                              {pendingCitesCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsGenerateCiteOpen(true)}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          title="Generar CITE correlativo oficial según los 5 Modelos del Instructivo"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Generar CITE</span>
                        </button>
                      </div>
                    </div>

                    <CiteSearchCombobox
                      value={cite}
                      onChange={(val) => {
                        setCite(val);
                        if (selectedCite && val !== selectedCite.citeCode) {
                          setSelectedCite(null);
                        }
                      }}
                      selectedCite={selectedCite}
                      onSelectCite={handleSelectCite}
                      onClearCite={handleClearCite}
                      onOpenBrowserModal={() => setIsSelectCiteModalOpen(true)}
                      placeholder="Ej. CHLS-MANT-INF-N° 001/2026 (o escribe para buscar)"
                    />

                    {/* Banner de CITE Oficial Vinculado */}
                    {selectedCite && (
                      <div className="mt-2 p-2.5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start justify-between gap-2 animate-fadeIn shadow-xs">
                        <div className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white">CITE Oficial Vinculado:</span>
                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                {selectedCite.citeCode}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {selectedCite.areaName}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                              <strong>Remitente:</strong> {selectedCite.senderName} ({selectedCite.senderRole}) &bull; <strong>Para:</strong> {selectedCite.recipient}
                            </p>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              ✓ El usuario verá en su Libro de Cites la Hoja de Ruta oficial asignada.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearCite}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Desvincular CITE y escribir manual"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Fojas</span>
                        <span className="text-rose-500 text-sm">*</span>
                      </span>
                      {isCountingPages ? (
                        <span className="text-[9px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-0.5 animate-pulse">
                          <Loader2 className="w-2 h-2 animate-spin text-amber-400" />
                          <span>...</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          {selectedFiles.length > 0 ? `${pageCount} f.` : 'Auto'}
                        </span>
                      )}
                    </label>
                    <div className="relative group">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        min="1"
                        value={pageCount}
                        readOnly={true}
                        tabIndex={-1}
                        className={`w-full pl-8 pr-3 py-2.5 bg-slate-100/90 dark:bg-slate-950/80 border rounded-2xl text-slate-900 dark:text-slate-200 font-mono font-bold text-sm outline-none shadow-xs cursor-not-allowed select-none transition-all ${
                          isCountingPages
                            ? 'border-amber-500/60 ring-1 ring-amber-500/20'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                        title="Cantidad inalterable: Calculada automáticamente a partir de los documentos digitalizados."
                      />
                    </div>
                  </div>
                </div>

                {/* Referencia / Asunto Principal */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-900 dark:text-white">Referencia / Asunto</span>
                      <span className="text-rose-500 text-sm">*</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      <Sparkles className="w-2.5 h-2.5 text-[#C5A059]" />
                      <span>Corrector IA</span>
                    </span>
                  </label>
                  <SmartCorrespondenceTextarea
                    rows={2}
                    placeholder="EJ. SOLICITUD DE ADQUISICIÓN DE ARENA Y MANTENIMIENTO PARA PISTAS DE SALTO HÍPICO"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    enablePrediction={true}
                    enableQuickPhrases={true}
                    className="w-full bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-slate-900 dark:text-white font-bold uppercase text-xs sm:text-sm focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none shadow-xs leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:normal-case placeholder:font-normal"
                  />
                </div>

                {/* Descripción de Anexos */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    <span className="text-slate-900 dark:text-white">Descripción de Adjuntos / Anexos</span>
                  </label>
                  <SmartCorrespondenceInput
                    placeholder="Ej. Formulario de Requerimiento + 3 Cotizaciones (5 fojas)"
                    value={attachmentDescription}
                    onChange={(e) => setAttachmentDescription(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Digitalización Cero Papel */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Digitalizar Archivos</span>
                    </label>
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Cero Papel
                    </span>
                  </div>

                  {/* Dropzone Container */}
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
                    className={`relative border-2 border-dashed rounded-2xl p-3 flex flex-col items-center justify-center transition-all text-center group cursor-pointer ${
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
                      <div className="flex flex-col items-center py-1.5 animate-pulse">
                        <Loader2 className="w-6 h-6 text-brand-gold animate-spin mb-1" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Contabilizando fojas automáticamente...
                        </span>
                      </div>
                    ) : isDraggingOver ? (
                      <div className="flex flex-col items-center py-1.5">
                        <UploadCloud className="w-6 h-6 text-brand-gold animate-bounce mb-1" />
                        <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                          ¡Suelta los archivos aquí!
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <div className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-brand-gold" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Arrastra archivos o <span className="text-emerald-700 dark:text-brand-gold underline">examinar</span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400">
                            PDF, fotos o documentos (conteo auto de fojas)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview Selected Files Chips */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-gray-400">
                          Archivos ({selectedFiles.length}) — Total: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{pageCount} fojas</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleRecalculatePages}
                          disabled={isCountingPages}
                          className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className={`w-3 h-3 ${isCountingPages ? 'animate-spin' : ''}`} />
                          <span>Recontar</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {selectedFiles.map((file, idx) => {
                          const pages = filePageCounts[file.name] || 1;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-black/60 border border-emerald-500/40 text-xs font-bold text-slate-900 dark:text-gray-200 shadow-xs"
                            >
                              <FileCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[140px]" title={file.name}>{file.name}</span>
                              <span className="text-[9px] font-black font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                {pages} f.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                                title="Quitar archivo"
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

              {/* Bottom Card Helper for Column 2 */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-sky-200/60 dark:border-sky-800/40 flex items-center justify-between">
                <span>Total Fojas Folio: <strong className="font-mono text-slate-900 dark:text-slate-200">{pageCount}</strong></span>
                <span className="text-sky-700 dark:text-sky-400 font-medium">Digitalización 100% Cero Papel</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* COLUMNA 3: PRIMER PROVEÍDO / DERIVACIÓN (Paso 3 de 3) - Tono Ámbar Bebé Pastel */}
            {/* ========================================================================= */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-500/25 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Primer Proveído
                    </h2>
                  </div>

                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Paso 3 de 3
                  </span>
                </div>

                <div className="space-y-3.5">
                    {/* Alerta si no hay conexiones autorizadas */}
                    {recommendedNodes.length === 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <div>
                          <span className="font-black block">Sin líneas autorizadas:</span>
                          <span className="text-[10px] text-red-600 dark:text-red-400">
                            {effectiveSourceArea} no tiene salidas configuradas en el Organigrama 360°.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Destino Principal */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Destino Principal (Cargo o Funcionario)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <DestinationSearchCombobox
                        currentArea={effectiveSourceArea}
                        selectedCargo={initialTargetArea}
                        selectedPersonName={initialTargetPerson}
                        workflow={workflow}
                        allowExtraordinary={allowExtraordinaryDerivation}
                        onToggleExtraordinary={canAccess360 ? setAllowExtraordinaryDerivation : undefined}
                        canAccess360={canAccess360}
                        onSelect={(cargo, personName) => {
                          setInitialTargetArea(cargo);
                          setInitialTargetPerson(personName);
                        }}
                        getResponsibleForCargo={(cargo) => {
                          const matched = allNodes.find(
                            (n) => (n.areaKey || n.title).toUpperCase() === cargo.toUpperCase()
                          );
                          if (matched && matched.manager) return matched.manager;
                          if (AREA_RESPONSIBLES[cargo]) return AREA_RESPONSIBLES[cargo].defaultPerson;
                          return '';
                        }}
                        accentColor="gold"
                        placeholder="Buscar cargo o funcionario..."
                      />
                    </div>

                    {/* CON COPIA A (C.C. INFORMATIVO) CON MOTOR DE BÚSQUEDA 360° */}
                    <div className="bg-white/70 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Copy className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Con Copia a (C.C. Informativo)</span>
                        </label>
                        <span className="text-[10px] text-amber-700 dark:text-[#E2C785] font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Search className="w-2.5 h-2.5 text-amber-500" />
                          <span>Motor de Búsqueda 360°</span>
                        </span>
                      </div>

                      {/* Motor de Búsqueda Integrado para C.C. */}
                      <CcSearchCombobox
                        selectedAreas={initialCcAreas}
                        onToggleArea={(area) => {
                          setInitialCcAreas((prev) =>
                            prev.some((a) => a.toUpperCase() === area.toUpperCase())
                              ? prev.filter((a) => a.toUpperCase() !== area.toUpperCase())
                              : [...prev, area]
                          );
                        }}
                        onRemoveArea={(area) => {
                          setInitialCcAreas((prev) =>
                            prev.filter((a) => a.toUpperCase() !== area.toUpperCase())
                          );
                        }}
                        onClearAll={() => setInitialCcAreas([])}
                        allNodes={allNodes}
                        workflow={workflow}
                        currentArea={effectiveSourceArea}
                        destinationArea={initialTargetArea}
                        getResponsibleForArea={(cargo) => {
                          const matched = allNodes.find(
                            (n) => (n.areaKey || n.title).toUpperCase() === cargo.toUpperCase()
                          );
                          if (matched && matched.manager) return matched.manager;
                          if (AREA_RESPONSIBLES[cargo]) return AREA_RESPONSIBLES[cargo].defaultPerson;
                          return '';
                        }}
                        placeholder="Buscar área, cargo o entidad externa para enviar copia (C.C.)..."
                      />
                    </div>

                    {/* SELLOS RÁPIDOS */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                          Sellos Rápidos <span className="text-[10px] font-normal text-slate-400 lowercase">(opcional)</span>
                        </label>
                        {initialQuickStamp ? (
                          <button
                            type="button"
                            onClick={() => setInitialQuickStamp('')}
                            className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20"
                            title="Quitar sello seleccionado"
                          >
                            <X className="w-2.5 h-2.5" />
                            <span>Quitar Sello</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg">
                            Sin Sello
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {QUICK_STAMPS.map((stamp) => {
                          const isCurrent = initialQuickStamp === stamp;
                          let activeStyles = 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-600 dark:text-[#C5A059] border-[#C5A059] ring-1 ring-[#C5A059]/40 shadow-xs';
                          if (stamp.includes('CONCLUIDO') || stamp.includes('ARCHIVAR')) {
                            activeStyles = 'bg-emerald-500/15 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs';
                          } else if (stamp.includes('OBSERVADO') || stamp.includes('SUBSANACIÓN')) {
                            activeStyles = 'bg-rose-500/15 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-500 ring-1 ring-rose-500/40 shadow-xs';
                          } else if (stamp.includes('VISTO BUENO') || stamp.includes('FIRMA')) {
                            activeStyles = 'bg-blue-500/15 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500/40 shadow-xs';
                          }

                          return (
                            <button
                              key={stamp}
                              type="button"
                              onClick={() => {
                                if (isCurrent) {
                                  setInitialQuickStamp('');
                                } else {
                                  setInitialQuickStamp(stamp);
                                  setInitialInstruction(stamp + ': Favor proceder conforme a reglamento.');
                                }
                              }}
                              className={`text-[11px] font-bold p-2 rounded-xl border transition-all text-center leading-tight cursor-pointer ${
                                isCurrent
                                  ? activeStyles
                                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
                              }`}
                              title={isCurrent ? 'Haz clic para deseleccionar' : 'Haz clic para aplicar'}
                            >
                              {stamp}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* INSTRUCCIÓN / PROVEÍDO */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Instrucción Oficial <span className="text-rose-500">*</span></span>
                        <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          <span>Fórmulas oficiales</span>
                        </span>
                      </label>
                      <SmartCorrespondenceTextarea
                        rows={2}
                        value={initialInstruction}
                        onChange={(e) => setInitialInstruction(e.target.value)}
                        required
                        enablePrediction={true}
                        enableQuickPhrases={true}
                        placeholder="Redacta la instrucción formal para el área de destino..."
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none shadow-xs leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

              {/* Bottom Card Helper for Column 3 */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
                <span>Derivación Inmediata: <strong className="text-slate-900 dark:text-slate-200">{initialTargetArea || 'Por asignar'}</strong></span>
                <span className="text-amber-600 dark:text-brand-gold font-medium">Flujo Oficial CHLS</span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BARRA INFERIOR DE ACCIÓN (FOOTER COMMAND BAR) */}
          {/* ========================================================================= */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-3.5 shrink-0">
            
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
              <span>Radicación activa: <strong className="text-slate-900 dark:text-slate-200">{senderType === 'AREA_INTERNA' ? senderArea : senderName || 'Nuevo Remitente'}</strong></span>
              <span>• Fojas: <strong className="text-slate-900 dark:text-slate-200">{pageCount}</strong></span>
              <span>• Prioridad: <strong className="text-amber-500">{priority}</strong></span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-7 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" />
                <span>{isSaving ? 'Generando Hoja de Ruta...' : 'Generar Hoja de Ruta Oficial 360°'}</span>
              </button>
            </div>

          </div>

        </form>

      </div>

      {/* Modal Generador de CITE Integrado */}
      {isGenerateCiteOpen && (
        <GenerateCiteModal
          isOpen={isGenerateCiteOpen}
          onClose={() => setIsGenerateCiteOpen(false)}
          currentPerspective={senderType === 'AREA_INTERNA' ? senderArea : (userNode?.title || (currentUser as any)?.area || (currentUser as any)?.department)}
          canAccessAllAreas={canAccess360}
          initialSubject={reference}
          onCiteCreated={(newCode, citeData) => {
            setCite(newCode);
            if (!reference && citeData?.subject) {
              setReference(citeData.subject);
            }
            if (!senderName && citeData?.senderName) {
              setSenderName(citeData.senderName);
            }
            setIsGenerateCiteOpen(false);
          }}
        />
      )}

      {/* Modal Selector y Explorador de CITEs de Usuarios */}
      {isSelectCiteModalOpen && (
        <SelectCiteModal
          isOpen={isSelectCiteModalOpen}
          onClose={() => setIsSelectCiteModalOpen(false)}
          selectedCiteId={selectedCite?.id}
          onSelectCite={(citeItem) => {
            handleSelectCite(citeItem);
            setIsSelectCiteModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
export default NewRouteSheetModal;
