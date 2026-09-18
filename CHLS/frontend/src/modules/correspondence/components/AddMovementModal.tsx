import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import {
  addMovement,
  uploadRouteSheetDocuments,
  fetchRouteSheetById,
  fetchRouteSheets,
  fetchCorrespondenceStats,
  fetchWorkflowSettings,
} from '@store/correspondenceSlice';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import {
  X,
  Send,
  Stamp,
  ArrowRight,
  Copy,
  Check,
  Building2,
  User,
  FileText,
  Sparkles,
  Paperclip,
  UploadCloud,
  Trash2,
  FileCheck,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Lock,
  GitBranch,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';
import CrestLogo from '@shared/components/CrestLogo';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';
import { getOrganigramDestinations, WorkflowNode, DEFAULT_ORGANIGRAM_NODES, isSameArea, getOrganigramNodeForUser } from '../utils/organigramWorkflowService';
import { countPdfPages } from '../utils/pdfPageCounter';
import DestinationSearchCombobox from './DestinationSearchCombobox';

interface AddMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem;
}

const QUICK_STAMPS = [
  'FAVOR SU ATENCIÓN',
  'FAVOR REALIZAR EL PAGO',
  'PARA INFORME TÉCNICO / LEGAL',
  'PARA SU CONOCIMIENTO Y FINES',
  'PARA VISTO BUENO Y FIRMA',
  'OBSERVADO / SOLICITAR SUBSANACIÓN',
  'TRÁMITE CONCLUIDO / ARCHIVAR',
];

// Catálogo institucional de Titulares y Responsables por Cargo / Despacho CHLS
const AREA_RESPONSIBLES: Record<string, { title: string; defaultPerson: string }> = {
  'GERENCIA GENERAL': { title: 'Gerencia General / MAE', defaultPerson: 'Gerente General' },
  'SECRETARÍA': { title: 'Secretaría de Despacho', defaultPerson: 'Secretaria de Gerencia' },
  'SECRETARÍA GENERAL': { title: 'Secretaría de Gerencia General', defaultPerson: 'María del Pilar Atanacio (Secretaria de Gerencia)' },
  'MENSAJERO': { title: 'Mensajería y Despacho Externo', defaultPerson: 'Mensajero Oficial' },
  'ASESORÍA LEGAL': { title: 'Asesoría Legal Principal', defaultPerson: 'Asesor Legal Principal' },
  'COORDINADOR COMERCIAL': { title: 'Coordinación Comercial', defaultPerson: 'Coordinador Comercial' },
  'SUBGERENCIA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS': { title: 'Subgerencia Financiera y RRHH', defaultPerson: 'Subgerente Financiero y RRHH' },
  'TESORERÍA Y FINANZAS': { title: 'Jefatura de Tesorería y Finanzas', defaultPerson: 'Jefe de Finanzas & Tesorería' },
  'APOYO J.O.F.R.H.': { title: 'Asistencia a Jefatura de Operaciones Financieras', defaultPerson: 'Personal de Apoyo J.O.F.R.H.' },
  'ARCHIVO': { title: 'Custodia y Archivo Central', defaultPerson: 'Responsable de Archivo Central' },
  'ARCHIVO CENTRAL': { title: 'Custodia y Archivo Central', defaultPerson: 'Responsable de Archivo Central' },
  'ALMACÉN': { title: 'Inventarios y Almacén Central', defaultPerson: 'Encargado de Almacén Central' },
  'ALMACÉN CENTRAL': { title: 'Inventarios y Almacén Central', defaultPerson: 'Encargado de Almacén Central' },
  'RECURSOS HUMANOS': { title: 'Planillas y Personal', defaultPerson: 'Encargado de RRHH' },
  'RESPONSABLE DE CONTRATACIONES': { title: 'Licitaciones y Proveedores', defaultPerson: 'Responsable de Contrataciones' },
  'CONTRATACIONES Y ADQUISICIONES': { title: 'Responsable de Compras & Contrataciones', defaultPerson: 'Responsable de Contrataciones' },
  'ASISTENTE ADMINISTRATIVO CONTRATACIONES': { title: 'Soporte Operativo a Compras', defaultPerson: 'Asistente de Contrataciones' },
  'ENCARGADO DE CONTABILIDAD': { title: 'Estados Financieros y Balance', defaultPerson: 'Encargado de Contabilidad' },
  'CONTABILIDAD': { title: 'Estados Financieros y Balance', defaultPerson: 'Encargado de Contabilidad' },
  'ANALISTA CONTABLE': { title: 'Asientos y Conciliaciones', defaultPerson: 'Analista Contable' },
  'ANALISTA CONTABLE - RECAUDACIONES': { title: 'Cobranza de Cuotas y Caja', defaultPerson: 'Analista de Recaudaciones' },
  'CAJERO': { title: 'Cobros en Ventanilla', defaultPerson: 'Cajero Principal' },
  'APOYO COBRANZAS': { title: 'Gestión de Cartera Morosa', defaultPerson: 'Encargado de Cobranzas' },
  'SUBGERENCIA DE ATENCIÓN AL SOCIO': { title: 'Experiencia del Socio', defaultPerson: 'Subgerente de Atención al Socio' },
  'ASISTENTE A.T.S.': { title: 'Asistencia a Subgerencia Atención al Socio', defaultPerson: 'Asistente A.T.S.' },
  'TÉCNICO ESPECIALISTA I': { title: 'Atención Técnica y Trámites', defaultPerson: 'Técnico Especialista' },
  'APOYO A.T.S.': { title: 'Atención a Socios y Visitantes', defaultPerson: 'Personal de Apoyo A.T.S.' },
  'RECEPCIONISTAS': { title: 'Recepción Central y Control', defaultPerson: 'Recepcionista Central' },
  'RECEPCIÓN': { title: 'Recepción Central y Control', defaultPerson: 'Recepcionista Central' },
  'CASETA DE ENTRADA': { title: 'Control de Puerta y Caseta', defaultPerson: 'Operador Caseta de Ingreso' },
  'ASISTENTE DE TOALLAS': { title: 'Control y Entrega de Toallas', defaultPerson: 'Asistente de Toallas' },
  'ENCARGADO DE SISTEMAS': { title: 'Tecnología, Redes y Plataformas', defaultPerson: 'Encargado de Sistemas & TI' },
  'SISTEMAS E INFORMÁTICA': { title: 'Tecnología, Redes y Plataformas', defaultPerson: 'Encargado de Sistemas & TI' },
  'COMUNICACIÓN': { title: 'Redes Sociales y Comunicados', defaultPerson: 'Encargado de Comunicación' },
  'JEFE DE MANTENIMIENTO': { title: 'Infraestructura y Servicios', defaultPerson: 'Jefe de Mantenimiento' },
  'MANTENIMIENTO Y OBRAS': { title: 'Infraestructura y Servicios', defaultPerson: 'Jefe de Mantenimiento' },
  'ASISTENTE PISCINERO': { title: 'Tratamiento de Aguas y Calderas', defaultPerson: 'Técnico Piscinero' },
  'ASISTENTE CANCHAS TENIS': { title: 'Mantenimiento de Canchas Tenis', defaultPerson: 'Asistente de Canchas Tenis' },
  'ASISTENTE POLÍGONO DE TIRO': { title: 'Polígono de Tiro', defaultPerson: 'Asistente Polígono de Tiro' },
  'COMISIÓN HÍPICA': { title: 'Capitanía Hípica & Área Ecuestre', defaultPerson: 'Capitán de Comisión Hípica' },
  'CAPITANÍA DEPORTES / TENIS': { title: 'Capitanía de Deportes & Tenis', defaultPerson: 'Capitán de Deportes' },
  'DIRECTORIO / PRESIDENCIA': { title: 'Directorio / Presidencia CHLS', defaultPerson: 'Directorio CHLS' },
};

export const AddMovementModal: React.FC<AddMovementModalProps> = ({ isOpen, onClose, item }) => {
  const dispatch = useDispatch<AppDispatch>();
  const workflow = useSelector((state: RootState) => state.correspondence.workflow);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Calcular todos los nombres de áreas oficiales disponibles
  const allAvailableAreas = useMemo(() => {
    const list = (workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES).map((n) => n.title || n.areaKey);
    return Array.from(new Set(list)).filter((a): a is string => Boolean(a));
  }, [workflow]);

  // Calcular destinos parametrizados en el Organigrama Oficial para el área actual
  const organigramInfo = useMemo(() => {
    return getOrganigramDestinations(item.currentArea, workflow);
  }, [item.currentArea, workflow]);

  // Detectar automáticamente el nodo oficial del usuario autenticado en el Organigrama
  const userNode = useMemo(() => {
    return getOrganigramNodeForUser(currentUser, workflow);
  }, [currentUser, workflow]);

  // Nombre oficial del firmante individualizado según el usuario autenticado
  const effectiveSignerName = useMemo(() => {
    if (!currentUser) return organigramInfo.currentNode?.manager || item.currentArea;
    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    if (fullName && fullName !== 'Usuario Desconocido') return fullName;
    if (userNode?.manager && !userNode.manager.toLowerCase().includes('gerente general')) {
      return userNode.manager;
    }
    return currentUser.email ? currentUser.email.split('@')[0] : 'Funcionario Autorizado';
  }, [currentUser, userNode, organigramInfo, item.currentArea]);

  // Cargo oficial del firmante individualizado según el usuario autenticado
  const effectiveSignerPosition = useMemo(() => {
    if (!currentUser) return 'Titular de Despacho';
    if ((currentUser as any).position) return (currentUser as any).position;
    if (userNode?.subtitle) {
      return userNode.subtitle.replace(/\s*\(\d+\)$/, '').trim();
    }
    if (userNode?.title) return userNode.title;
    if (currentUser.roles && currentUser.roles.length > 0) {
      const r = currentUser.roles[0];
      const rName = typeof r === 'string' ? r : (r as any).name || '';
      if (rName) return rName.replace(/_/g, ' ');
    }
    return 'Titular de Despacho';
  }, [currentUser, userNode]);

  // Área oficial del firmante según el usuario autenticado
  const effectiveSignerArea = useMemo(() => {
    return (currentUser as any)?.area || userNode?.title || item.currentArea;
  }, [currentUser, userNode, item.currentArea]);

  const { upwardNodes = [], downwardNodes = [], lateralNodes = [], recommendedNodes = [] } = organigramInfo;
  const hasConnectedDestinations = recommendedNodes.length > 0;

  const [targetArea, setTargetArea] = useState<string>('');
  const [targetPersonName, setTargetPersonName] = useState<string>('');
  const [allowExtraordinaryDerivation, setAllowExtraordinaryDerivation] = useState(false);
  const [selectedCcAreas, setSelectedCcAreas] = useState<string[]>([]);
  const [ccPersonsText, setCcPersonsText] = useState('');
  const [quickStamp, setQuickStamp] = useState<string>('');
  const [instruction, setInstruction] = useState('Para su atención correspondiente según procedimientos institucionales.');
  const [newStatus, setNewStatus] = useState<string>('DERIVADO');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [movementFiles, setMovementFiles] = useState<File[]>([]);
  const [filePageCounts, setFilePageCounts] = useState<{ [fileName: string]: number }>({});
  const [attachedPages, setAttachedPages] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchCcTerm, setSearchCcTerm] = useState('');
  const [isCcDropdownOpen, setIsCcDropdownOpen] = useState(false);
  const ccDropdownRef = useRef<HTMLDivElement>(null);
  const [searchDestinationTerm, setSearchDestinationTerm] = useState('');

  // Sincronizar siempre con los ajustes y flujo guardado más reciente del Organigrama al abrir el modal
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchWorkflowSettings());
      setQuickStamp('');
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ccDropdownRef.current && !ccDropdownRef.current.contains(event.target as Node)) {
        setIsCcDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resuelve y autocompleta el responsable / titular del despacho o cargo seleccionado respetando el Organigrama Oficial
  const getResponsibleForCargo = (cargoOrArea: string): string => {
    if (!cargoOrArea) return '';
    const activeNodes = workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;

    const exactNode = activeNodes.find(
      (n) =>
        (n.title && n.title.toUpperCase().trim() === cargoOrArea.toUpperCase().trim()) ||
        (n.areaKey && n.areaKey.toUpperCase().trim() === cargoOrArea.toUpperCase().trim()) ||
        n.id === cargoOrArea
    );
    if (exactNode?.manager && exactNode.manager.trim()) {
      return exactNode.manager.trim();
    }

    const normCargo = cargoOrArea
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normNode = activeNodes.find((n) => {
      const nTitle = (n.title || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const nKey = (n.areaKey || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return nTitle === normCargo || nKey === normCargo;
    });
    if (normNode?.manager && normNode.manager.trim()) {
      return normNode.manager.trim();
    }

    if (AREA_RESPONSIBLES[cargoOrArea]) {
      return AREA_RESPONSIBLES[cargoOrArea].defaultPerson;
    }

    const matchedKey = Object.keys(AREA_RESPONSIBLES).find(
      (k) => k.toUpperCase().trim() === cargoOrArea.toUpperCase().trim()
    );
    if (matchedKey && AREA_RESPONSIBLES[matchedKey]) {
      return AREA_RESPONSIBLES[matchedKey].defaultPerson;
    }

    const matchedNode = activeNodes.find(
      (n) => isSameArea(n.title, cargoOrArea) || isSameArea(n.areaKey, cargoOrArea)
    );
    if (matchedNode?.manager && matchedNode.manager.trim()) {
      return matchedNode.manager.trim();
    }

    return exactNode?.subtitle || exactNode?.title || cargoOrArea;
  };

  const filteredCcAreas = useMemo(() => {
    const query = searchCcTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return allAvailableAreas.filter((area) => {
      if (area === targetArea) return false;
      if (selectedCcAreas.includes(area)) return false;
      if (!query) return true;
      const normArea = area.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const resp = getResponsibleForCargo(area).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normArea.includes(query) || resp.includes(query);
    });
  }, [allAvailableAreas, targetArea, selectedCcAreas, searchCcTerm]);

  // Auto-seleccionar el primer destino conectado del organigrama o primer despacho oficial y su responsable
  useEffect(() => {
    let initialCargo = '';
    if (organigramInfo.recommendedNodes && organigramInfo.recommendedNodes.length > 0) {
      initialCargo = organigramInfo.recommendedNodes[0].node.title;
    } else if (allowExtraordinaryDerivation && organigramInfo.allNodes && organigramInfo.allNodes.length > 0) {
      const firstNonCurrent = organigramInfo.allNodes.find(n => !isSameArea(n.title, item.currentArea)) || organigramInfo.allNodes[0];
      initialCargo = firstNonCurrent.title;
    }

    if (initialCargo) {
      setTargetArea(initialCargo);
      const autoResp = getResponsibleForCargo(initialCargo);
      setTargetPersonName(autoResp);
    }
  }, [organigramInfo, item.currentArea, allowExtraordinaryDerivation]);

  if (!isOpen) return null;

  const handleSelectStamp = (stamp: string) => {
    if (quickStamp === stamp) {
      // Si el usuario hace clic en el sello ya activo, se desactiva (sin sello)
      setQuickStamp('');
      return;
    }
    setQuickStamp(stamp);
    if (stamp === 'TRÁMITE CONCLUIDO / ARCHIVAR') {
      setInstruction('Trámite atendido satisfactoriamente. Proceder al archivo correspondiente.');
      setNewStatus('CONCLUIDO');
    } else if (stamp === 'OBSERVADO / SOLICITAR SUBSANACIÓN') {
      setInstruction('Se observan discrepancias en la documentación. Favor subsanar en un plazo de 10 días.');
      setNewStatus('OBSERVADO');
    } else {
      setInstruction(stamp);
      setNewStatus('DERIVADO');
    }
  };

  const handleSelectNode = (node: WorkflowNode) => {
    setTargetArea(node.title);
    const autoResp = getResponsibleForCargo(node.title);
    setTargetPersonName(autoResp);
    toast.success(`Destino: ${node.title} → Responsable: ${autoResp}`, {
      icon: '👤',
      duration: 3000,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedList = Array.from(e.target.files);
      const invalidFiles = selectedList.filter(
        (file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')
      );
      const validPdfFiles = selectedList.filter(
        (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      );

      if (invalidFiles.length > 0) {
        toast.error(
          `En las derivaciones solo se admiten documentos en formato PDF (.pdf). Se omitieron ${invalidFiles.length} archivo(s) no válidos.`,
          { duration: 5000, icon: '📄' }
        );
      }

      if (validPdfFiles.length > 0) {
        const toastId = toast.loading('Contando fojas/hojas de los documentos PDF...');
        try {
          const newCounts: { [fileName: string]: number } = { ...filePageCounts };
          let addedPages = 0;

          for (const file of validPdfFiles) {
            const pages = await countPdfPages(file);
            newCounts[file.name] = pages;
            addedPages += pages;
          }

          setFilePageCounts(newCounts);
          setMovementFiles((prev) => [...prev, ...validPdfFiles]);
          setAttachedPages((prev) => prev + addedPages);

          toast.success(
            `Se contabilizaron ${addedPages} hoja(s)/foja(s) en ${validPdfFiles.length} archivo(s) PDF adjunto(s)`,
            { id: toastId, icon: '📑' }
          );
        } catch (err) {
          console.error('Error counting PDF pages:', err);
          toast.dismiss(toastId);
        }
      }
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = movementFiles[index];
    const pagesOfFile = fileToRemove ? (filePageCounts[fileToRemove.name] || 0) : 0;

    setMovementFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileToRemove) {
      setFilePageCounts((prev) => {
        const next = { ...prev };
        delete next[fileToRemove.name];
        return next;
      });
      setAttachedPages((prev) => Math.max(0, prev - pagesOfFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instruction.trim()) {
      toast.error('Por favor escribe la instrucción del proveído');
      return;
    }

    if (!targetArea.trim()) {
      toast.error('Por favor selecciona el cargo o despacho de destino para la derivación.');
      return;
    }

    const nonPdfFiles = movementFiles.filter(
      (file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')
    );
    if (nonPdfFiles.length > 0) {
      toast.error('En las derivaciones todos los documentos adjuntos deben ser estrictamente en formato PDF (.pdf).');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Registrando proveído y derivación...');

    try {
      const action = await dispatch(
        addMovement({
          routeSheetId: item.id,
          data: {
            targetArea: targetArea.trim(),
            targetPersonName: targetPersonName.trim() || null,
            ccAreas: selectedCcAreas,
            ccPersons: ccPersonsText.trim() || null,
            instruction: instruction.trim(),
            quickStamp: quickStamp.trim() || null,
            signatureUrl,
            newStatus,
          },
        })
      );

      if (addMovement.fulfilled.match(action)) {
        const createdMovementId = (action.payload as any)?.movement?.id;

        // Upload documents attached to this movement/route sheet (strictly PDF) with registered page count
        if (movementFiles.length > 0) {
          toast.loading('Subiendo y digitalizando documentos adjuntos en PDF...', { id: toastId });
          try {
            await dispatch(
              uploadRouteSheetDocuments({
                routeSheetId: item.id,
                files: movementFiles,
                isDerivation: true,
                movementId: createdMovementId,
                attachedPages: attachedPages > 0 ? attachedPages : undefined,
              })
            );
          } catch {
            console.error('Error subiendo adjuntos del proveído');
          }
        }

        // Refrescar expediente y lista completa
        await dispatch(fetchRouteSheetById(item.id));
        await dispatch(fetchRouteSheets());
        dispatch(fetchCorrespondenceStats());

        toast.success(`Derivación oficial enviada a ${targetArea} con éxito`, { id: toastId });
        onClose();
      } else {
        toast.error((action.payload as string) || 'Error al agregar el proveído', { id: toastId });
      }
    } catch {
      toast.error('Error inesperado al guardar', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-center p-2 sm:p-4 lg:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/40 w-full max-w-7xl xl:max-w-[94vw] 2xl:max-w-[1700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Expandido con Datos del Trámite */}
        <div className="px-6 sm:px-8 py-4 border-b border-slate-200 dark:border-emerald-800/40 flex justify-between items-center bg-slate-50 dark:bg-[#07130E] flex-wrap gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <CrestLogo size="sm" className="w-10 h-10 shrink-0 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.25)]" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/50 px-3 py-0.5 rounded-lg border border-emerald-500/30 tracking-wider">
                  {item.hrCode}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  CITE: {item.cite || 'S/N'}
                </span>
                <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  Custodia: {item.currentArea}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1 truncate">
                <Stamp className="w-5 h-5 text-[#C5A059] shrink-0" />
                <span className="truncate">Nuevo Proveído & Derivación Formal: {item.reference}</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Secuencia Natural de Lectura Humana: Izquierda a Derecha por Fila */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 lg:p-6 overflow-y-auto flex-1 space-y-3.5 text-sm">
          
          {/* Fila 1 (Izquierda a Derecha): 1. Destino | 2. Con Copia (C.C.) | 3. Estado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
            
            {/* 1. Destino Principal */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span>1. Destino</span>
                  <span className="text-rose-500">*</span>
                </span>
              </div>

              <DestinationSearchCombobox
                currentArea={item.currentArea}
                selectedCargo={targetArea}
                selectedPersonName={targetPersonName}
                workflow={workflow}
                onSelect={(cargo, personName) => {
                  setTargetArea(cargo);
                  setTargetPersonName(personName || getResponsibleForCargo(cargo));
                }}
                getResponsibleForCargo={getResponsibleForCargo}
                accentColor="emerald"
                placeholder="Buscar cargo o funcionario..."
              />
            </div>

            {/* 2. Con Copia a (C.C.) */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-[#C5A059]" />
                  <span>2. Con Copia (C.C.)</span>
                </span>
                {selectedCcAreas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCcAreas([])}
                    className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div ref={ccDropdownRef} className="relative">
                <div className={`relative flex items-center bg-white dark:bg-[#07130E] border rounded-xl transition-all shadow-sm ${
                  isCcDropdownOpen
                    ? 'border-[#C5A059] ring-2 ring-[#C5A059]/20'
                    : 'border-slate-300 dark:border-slate-700'
                }`}>
                  <Search className={`w-4 h-4 ml-3.5 mr-2 shrink-0 ${isCcDropdownOpen ? 'text-[#C5A059]' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="Buscar para copia..."
                    value={searchCcTerm}
                    onFocus={() => setIsCcDropdownOpen(true)}
                    onChange={(e) => {
                      setSearchCcTerm(e.target.value);
                      setIsCcDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchCcTerm.trim()) {
                        e.preventDefault();
                        const val = searchCcTerm.trim();
                        if (!selectedCcAreas.includes(val)) {
                          setSelectedCcAreas((prev) => [...prev, val]);
                        }
                        setSearchCcTerm('');
                        setIsCcDropdownOpen(false);
                      }
                    }}
                    className="w-full bg-transparent py-2 pr-10 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCcDropdownOpen((prev) => !prev)}
                    className="p-1 mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCcDropdownOpen ? 'rotate-180 text-[#C5A059]' : ''}`} />
                  </button>
                </div>

                {isCcDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-48 overflow-y-auto bg-white dark:bg-[#07130E] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-0.5 animate-fadeIn backdrop-blur-md">
                    {filteredCcAreas.length > 0 ? (
                      filteredCcAreas.map((area) => {
                        const resp = getResponsibleForCargo(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => {
                              setSelectedCcAreas((prev) => [...prev, area]);
                              setSearchCcTerm('');
                              setIsCcDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 truncate">
                              <span className="font-bold uppercase truncate">{area}</span>
                              {resp && <span className="text-[11px] text-slate-400 ml-1.5 truncate">({resp})</span>}
                            </div>
                            <span className="text-[10px] text-[#C5A059] font-bold shrink-0">+ Copia</span>
                          </button>
                        );
                      })
                    ) : searchCcTerm.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          const val = searchCcTerm.trim();
                          if (!selectedCcAreas.includes(val)) {
                            setSelectedCcAreas((prev) => [...prev, val]);
                          }
                          setSearchCcTerm('');
                          setIsCcDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <span className="font-semibold text-[#C5A059] truncate">+ Agregar "{searchCcTerm.trim()}" en copia</span>
                      </button>
                    ) : (
                      <div className="p-2.5 text-center text-xs text-slate-400">
                        Todas las áreas agregadas
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCcAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCcAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold"
                    >
                      <span className="truncate max-w-[180px]">{area}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCcAreas((prev) => prev.filter((a) => a !== area))}
                        className="w-3.5 h-3.5 rounded-full hover:bg-amber-500/30 flex items-center justify-center text-[10px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Estado */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  <span>3. Estado</span>
                </label>
              </div>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-white dark:bg-[#07130E] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-semibold text-xs focus:border-[#C5A059] outline-none shadow-sm cursor-pointer"
              >
                <option value="DERIVADO">DERIVADO (En traslado a otra área)</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="OBSERVADO">OBSERVADO</option>
                <option value="EN_APROBACION">EN APROBACIÓN</option>
                <option value="CONCLUIDO">CONCLUIDO</option>
              </select>
            </div>

          </div>

          {/* Fila 2 (Izquierda a Derecha): 4. Sellos Rápidos | 5. Proveído / Instrucción | 6. Documentos Adjuntos (PDF) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
            
            {/* 4. Sellos Rápidos */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-[#C5A059]" />
                  <span>4. Sellos Rápidos</span>
                </span>
                {quickStamp && (
                  <button
                    type="button"
                    onClick={() => setQuickStamp('')}
                    className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar Sello
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {QUICK_STAMPS.map((stamp) => {
                  const isSelected = quickStamp === stamp;
                  return (
                    <button
                      key={stamp}
                      type="button"
                      onClick={() => handleSelectStamp(stamp)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-600 dark:text-[#C5A059] border-[#C5A059] ring-2 ring-[#C5A059]/40 shadow-sm'
                          : 'bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="truncate">{stamp}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Proveído / Instrucción */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span>5. Proveído / Instrucción</span>
                  <span className="text-rose-500">*</span>
                </label>
              </div>
              <SmartCorrespondenceTextarea
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                required
                enablePrediction={true}
                enableQuickPhrases={true}
                placeholder="Escribe la instrucción o proveído formal..."
                className="w-full flex-1 bg-white dark:bg-[#07130E] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-xs focus:border-[#C5A059] outline-none leading-relaxed shadow-sm resize-none"
              />
            </div>

            {/* 6. Documentos Adjuntos (PDF) */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#C5A059]" />
                  <span>6. Documentos Adjuntos (PDF)</span>
                </span>
                {attachedPages > 0 && (
                  <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    +{attachedPages} {attachedPages === 1 ? 'foja' : 'fojas'}
                  </span>
                )}
              </div>

              <label className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-white dark:bg-[#07130E] py-2 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-500 shadow-sm">
                <UploadCloud className="w-4 h-4 text-emerald-500" />
                <span>+ Adjuntar archivo PDF</span>
                <input type="file" multiple accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
              </label>

              {movementFiles.length > 0 && (
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {movementFiles.map((file, idx) => {
                    const pages = filePageCounts[file.name] || 1;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate max-w-[150px] font-medium text-slate-800 dark:text-slate-200">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-amber-500 font-bold">{pages} {pages === 1 ? 'pág' : 'págs'}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Fila 3: 7. Firma Digital & Sello Institucional */}
          <div>
            <DigitalSignaturePad
              userId={currentUser?.id}
              signerName={effectiveSignerName}
              signerArea={effectiveSignerArea}
              signerPosition={effectiveSignerPosition}
              stampText={quickStamp}
              onSignatureChange={setSignatureUrl}
              initialSignature={signatureUrl}
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetArea || organigramInfo.recommendedNodes.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-7 py-3 rounded-xl text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-white" />
              <span>
                {isSubmitting
                  ? 'Registrando...'
                  : organigramInfo.recommendedNodes.length === 0
                  ? 'Sin Conexión en Organigrama'
                  : 'Emitir Proveído & Derivar'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default AddMovementModal;
