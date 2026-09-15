import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { addMovement, uploadRouteSheetDocuments, fetchRouteSheetById, fetchRouteSheets } from '@store/correspondenceSlice';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';
import CrestLogo from '@shared/components/CrestLogo';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';
import { getOrganigramDestinations, WorkflowNode, DEFAULT_ORGANIGRAM_NODES, isSameArea } from '../utils/organigramWorkflowService';
import { countPdfPages } from '../utils/pdfPageCounter';

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

  // Calcular todos los nombres de áreas oficiales disponibles
  const allAvailableAreas = useMemo(() => {
    const list = (workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES).map((n) => n.title || n.areaKey);
    return Array.from(new Set(list)).filter((a): a is string => Boolean(a));
  }, [workflow]);

  // Calcular destinos parametrizados en el Organigrama Oficial para el área actual
  const organigramInfo = useMemo(() => {
    return getOrganigramDestinations(item.currentArea, workflow);
  }, [item.currentArea, workflow]);

  const [targetArea, setTargetArea] = useState<string>('');
  const [targetPersonName, setTargetPersonName] = useState<string>('');
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ccDropdownRef.current && !ccDropdownRef.current.contains(event.target as Node)) {
        setIsCcDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCcAreas = useMemo(() => {
    const query = searchCcTerm.toLowerCase().trim();
    return allAvailableAreas.filter((area) => {
      if (area === targetArea) return false;
      if (selectedCcAreas.includes(area)) return false;
      if (!query) return true;
      return area.toLowerCase().includes(query);
    });
  }, [allAvailableAreas, targetArea, selectedCcAreas, searchCcTerm]);

  // Resuelve y autocompleta el responsable / titular del despacho o cargo seleccionado
  const getResponsibleForCargo = (cargoOrArea: string): string => {
    if (!cargoOrArea) return '';
    const activeNodes = workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;

    const matchedNode = activeNodes.find(
      (n) =>
        (n.title && n.title.toUpperCase() === cargoOrArea.toUpperCase()) ||
        (n.areaKey && n.areaKey.toUpperCase() === cargoOrArea.toUpperCase()) ||
        n.id === cargoOrArea ||
        isSameArea(n.title, cargoOrArea) ||
        isSameArea(n.areaKey, cargoOrArea)
    );

    if (matchedNode?.manager && matchedNode.manager.trim()) {
      return matchedNode.manager.trim();
    }

    if (AREA_RESPONSIBLES[cargoOrArea]) {
      return AREA_RESPONSIBLES[cargoOrArea].defaultPerson;
    }

    const matchedKey = Object.keys(AREA_RESPONSIBLES).find((k) => isSameArea(k, cargoOrArea));
    if (matchedKey && AREA_RESPONSIBLES[matchedKey]) {
      return AREA_RESPONSIBLES[matchedKey].defaultPerson;
    }

    return matchedNode?.subtitle || matchedNode?.title || cargoOrArea;
  };

  // Auto-seleccionar el primer destino conectado del organigrama o primer despacho oficial y su responsable
  useEffect(() => {
    let initialCargo = '';
    if (organigramInfo.recommendedNodes && organigramInfo.recommendedNodes.length > 0) {
      initialCargo = organigramInfo.recommendedNodes[0].node.title;
    } else if (organigramInfo.allNodes && organigramInfo.allNodes.length > 0) {
      const firstNonCurrent = organigramInfo.allNodes.find(n => !isSameArea(n.title, item.currentArea)) || organigramInfo.allNodes[0];
      initialCargo = firstNonCurrent.title;
    }

    if (initialCargo) {
      setTargetArea(initialCargo);
      const autoResp = getResponsibleForCargo(initialCargo);
      setTargetPersonName(autoResp);
    }
  }, [organigramInfo, item.currentArea]);

  useEffect(() => {
    if (isOpen) {
      setQuickStamp('');
    }
  }, [isOpen]);

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

        {/* Form Body - 3 Columns on Desktop */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-7 overflow-y-auto flex-1 space-y-6 text-sm">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 xl:gap-6">
            
            {/* Left Column: Destino Principal & Con Copia (C.C.) */}
            <div className="space-y-6">
              
              {/* 1. Destino Principal Parametrizado por Cargo / Organigrama */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-emerald-800/40 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>1. Derivar a (Cargo o Despacho de Destino)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Línea de Mando
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Selector de Cargo / Despacho con llenado automático del Responsable */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="font-semibold">Seleccionar Cargo o Despacho</span>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                        Destino Institucional
                      </span>
                    </label>
                    <select
                      value={targetArea}
                      onChange={(e) => {
                        const selCargo = e.target.value;
                        setTargetArea(selCargo);
                        const autoResp = getResponsibleForCargo(selCargo);
                        setTargetPersonName(autoResp);
                      }}
                      className="w-full bg-white dark:bg-[#07130E] border border-slate-300 dark:border-emerald-800/50 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 font-semibold text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm cursor-pointer transition-all"
                    >
                      {/* 1. Destinos Recomendados según Conexiones del Organigrama */}
                      {organigramInfo.recommendedNodes.length > 0 && (
                        <optgroup label="Destinos Recomendados (Conectores Activos)">
                          {organigramInfo.recommendedNodes.map(({ node, edgeLabel, direction }) => (
                            <option key={`rec-${node.id}`} value={node.title} className="bg-slate-900 text-white font-semibold">
                              {direction === 'DOWN' ? '↓' : '↑'} {node.title} — {getResponsibleForCargo(node.title)} ({edgeLabel})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* 2. Todos los Cargos y Despachos Oficiales CHLS */}
                      <optgroup label="Todos los Cargos y Despachos Institucionales CHLS">
                        {organigramInfo.allNodes
                          .filter((n) => !isSameArea(n.title, item.currentArea))
                          .map((node) => (
                            <option key={`all-${node.id}`} value={node.title} className="bg-slate-900 text-white font-medium">
                              {node.title} — {getResponsibleForCargo(node.title)}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Responsable / Titular de Despacho</span>
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Autocompletado
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre del responsable o titular..."
                      value={targetPersonName}
                      onChange={(e) => setTargetPersonName(e.target.value)}
                      className="w-full bg-white dark:bg-[#07130E] border border-slate-300 dark:border-emerald-800/50 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 font-semibold text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Con Copia a (C.C. Informativo con Lista Desplegable) */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Copy className="w-4 h-4 text-[#C5A059]" />
                    <span>2. Con Copia a (C.C. Informativo)</span>
                  </span>
                  {selectedCcAreas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {selectedCcAreas.length} {selectedCcAreas.length === 1 ? 'área' : 'áreas'} con copia
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCcAreas([])}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Limpiar todo
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Busca o despliega la lista para seleccionar las áreas que deben recibir copia informativa de este trámite:
                </p>

                {/* Combobox con Buscador Integrado y Menú Desplegable */}
                <div ref={ccDropdownRef} className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar o desplegar área para copia C.C. ..."
                      value={searchCcTerm}
                      onFocus={() => setIsCcDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchCcTerm(e.target.value);
                        setIsCcDropdownOpen(true);
                      }}
                      className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 dark:text-white font-medium text-sm focus:border-[#C5A059] outline-none shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCcDropdownOpen((prev) => !prev)}
                      className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title={isCcDropdownOpen ? 'Cerrar lista' : 'Abrir lista desplegable'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCcDropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Panel Desplegable Flotante */}
                  {isCcDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fadeIn backdrop-blur-md">
                      {filteredCcAreas.length > 0 ? (
                        filteredCcAreas.map((area) => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => {
                              setSelectedCcAreas((prev) => [...prev, area]);
                              setSearchCcTerm('');
                              setIsCcDropdownOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <span className="truncate">{area}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:bg-[#C5A059] group-hover:text-slate-950 transition-colors shrink-0 ml-2">
                              + Agregar
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {searchCcTerm.trim()
                            ? `No se encontraron áreas con "${searchCcTerm}".`
                            : 'Todas las áreas disponibles ya han sido seleccionadas.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Áreas Seleccionadas con Badges Removibles */}
                {selectedCcAreas.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                      Áreas que recibirán copia (haz clic en ✕ para remover):
                    </span>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                      {selectedCcAreas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C5A059] text-slate-950 text-xs font-semibold shadow-sm transition-all"
                        >
                          <span>{area}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCcAreas((prev) => prev.filter((a) => a !== area))}
                            title="Quitar copia a esta área"
                            className="w-3.5 h-3.5 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors cursor-pointer text-[9px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-xs text-slate-400 italic">
                      Sin áreas con copia seleccionadas. Elige del menú desplegable superior si deseas notificar en paralelo.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Personas o Cargos Específicos en C.C. (Opcional)
                  </label>
                  <SmartCorrespondenceInput
                    placeholder="Ej. Asesoría Legal Externa, Auditoría Interna, etc."
                    value={ccPersonsText}
                    onChange={(e) => setCcPersonsText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-[#C5A059] shadow-sm"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Sellos, Instrucción & Estado */}
            <div className="space-y-6">
              
              {/* 3. Sellos Frecuentes de 1 Toque */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-[#C5A059]" />
                    <span>3. Sellos Frecuentes de 1 Toque</span>
                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 lowercase">(opcional)</span>
                  </span>
                  {quickStamp ? (
                    <button
                      type="button"
                      onClick={() => setQuickStamp('')}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-xl border border-rose-500/20"
                      title="Quitar sello seleccionado"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Quitar Sello</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-300/40 dark:border-slate-700/40">
                      Sin Sello
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_STAMPS.map((stamp) => {
                    const isSelected = quickStamp === stamp;
                    return (
                      <button
                        key={stamp}
                        type="button"
                        onClick={() => handleSelectStamp(stamp)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all text-left flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 dark:bg-slate-800 text-[#C5A059] border-[#C5A059]/60 shadow-sm ring-1 ring-[#C5A059]/40'
                            : 'bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                        title={isSelected ? 'Haz clic para deseleccionar este sello' : 'Haz clic para aplicar este sello'}
                      >
                        <span className="truncate">{stamp}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Instrucción / Proveído */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C5A059]" />
                    <span>4. Instrucción / Proveído del Trámite</span>
                    <span className="text-rose-500">*</span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Autocorrector de acentos & Predicción</span>
                  </span>
                </label>
                <SmartCorrespondenceTextarea
                  rows={3}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  required
                  enablePrediction={true}
                  enableQuickPhrases={true}
                  placeholder="Escribe la instrucción o proveído formal..."
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 text-slate-900 dark:text-white font-medium text-sm focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none leading-relaxed shadow-sm"
                />

                {/* 5. Digitalizar / Adjuntar Documento de Respuesta / Informe Técnico */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>5. Digitalizar / Adjuntar Documento Oficial (PDF)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      Solo PDF
                    </span>
                  </div>

                  <label className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#C5A059] bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-sm">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <UploadCloud className="w-5 h-5 text-[#C5A059] group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        + Digitalizar / Adjuntar Informe o Proveído en PDF
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Haz clic para seleccionar o arrastra aquí el documento escaneado (.pdf) de respuesta o informe
                    </span>
                  </label>

                  {/* Chips of attached files con conteo individual de hojas */}
                  {movementFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {movementFiles.map((file, idx) => {
                        const pages = filePageCounts[file.name] || 1;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-200 shadow-sm"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[170px] sm:max-w-[210px]">{file.name}</span>
                            <span className="text-[10px] font-bold font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              {pages} {pages === 1 ? 'hoja' : 'hojas'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 ml-0.5 cursor-pointer"
                              title="Remover archivo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Panel Destacado de Conteo y Registro de Hojas Adjuntas (Inalterable) */}
                  {movementFiles.length > 0 && (
                    <div className="bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200">
                              Cantidad de Hojas Adjuntas
                            </span>
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-500" />
                              <span>Conteo Automático Protegido</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Total de páginas auditadas en {movementFiles.length} archivo(s) PDF (no modificable manualmente)
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner select-none cursor-not-allowed"
                        title="Conteo automatizado por lectura digital de PDF. No modificable manualmente."
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="w-10 text-center font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                          {attachedPages}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono">
                          {attachedPages === 1 ? 'hoja' : 'hojas'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Column 3 (Right): Estado, Firma Digital & Resumen en Vivo */}
            <div className="space-y-5">
              
              {/* 5. Nuevo Estado */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  5. Nuevo Estado de la Hoja de Ruta
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold text-sm focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none shadow-sm"
                >
                  <option value="DERIVADO">DERIVADO (En traslado a otra área)</option>
                  <option value="EN_PROCESO">EN PROCESO (En elaboración de informe)</option>
                  <option value="OBSERVADO">OBSERVADO (Requiere corrección o datos)</option>
                  <option value="EN_APROBACION">EN APROBACIÓN (Directorio / Gerencia)</option>
                  <option value="CONCLUIDO">CONCLUIDO (Atendido y finalizado)</option>
                </select>
              </div>

              {/* 6. Firma Digital & Sello Institucional */}
              <DigitalSignaturePad
                signerName={organigramInfo.currentNode?.manager || item.currentArea}
                signerArea={item.currentArea}
                signerPosition={organigramInfo.currentNode?.subtitle || organigramInfo.currentNode?.type || 'Titular de Despacho'}
                onSignatureChange={setSignatureUrl}
                initialSignature={signatureUrl}
              />

              {/* 7. Tarjeta de Resumen / Auditoría en Vivo de la Derivación */}
              <div className="bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Resumen Oficial de Derivación</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    HR: {item.hrCode}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Área Emisora:</span>
                    <strong className="text-slate-900 dark:text-white">{item.currentArea}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Área Destino:</span>
                    <strong className="text-[#C5A059]">{targetArea || 'Sin seleccionar'}</strong>
                  </div>

                  {targetPersonName && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Responsable:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{targetPersonName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Copias C.C.:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedCcAreas.length > 0 ? `${selectedCcAreas.length} área(s)` : 'Ninguna'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Adjuntos PDF:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {movementFiles.length > 0 ? `${movementFiles.length} archivo(s)` : 'Sin adjuntos'}
                    </span>
                  </div>

                  {movementFiles.length > 0 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Hojas Adjuntas:</span>
                      <span className="font-mono font-bold text-amber-500">
                        + {attachedPages} {attachedPages === 1 ? 'hoja / foja' : 'hojas / fojas'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Fojas Totales HR:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.pageCount || 1} {attachedPages > 0 ? `➔ ${(item.pageCount || 1) + attachedPages} fojas` : 'fojas'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Firma Digital:</span>
                    <span className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-lg ${
                      signatureUrl
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {signatureUrl ? '✓ Registrada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

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
