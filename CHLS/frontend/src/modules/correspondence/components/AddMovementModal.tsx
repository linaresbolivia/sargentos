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
import { getOrganigramDestinations, WorkflowNode, DEFAULT_ORGANIGRAM_NODES } from '../utils/organigramWorkflowService';
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
  const [quickStamp, setQuickStamp] = useState('FAVOR SU ATENCIÓN');
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

  // Auto-seleccionar el primer destino conectado del organigrama
  useEffect(() => {
    if (organigramInfo.recommendedNodes && organigramInfo.recommendedNodes.length > 0) {
      const firstDest = organigramInfo.recommendedNodes[0].node;
      setTargetArea(firstDest.title);
      setTargetPersonName(firstDest.manager || '');
    } else {
      setTargetArea('');
      setTargetPersonName('');
    }
  }, [organigramInfo, item.currentArea]);

  if (!isOpen) return null;

  const handleSelectStamp = (stamp: string) => {
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
    if (node.manager) {
      setTargetPersonName(node.manager);
    }
    toast.success(`Destino asignado: ${node.title} (${node.manager || 'Titular'})`, {
      icon: '🧭',
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

    if (!targetArea.trim() || organigramInfo.recommendedNodes.length === 0) {
      toast.error('No se puede derivar: este despacho no tiene conexiones autorizadas en el Organigrama.');
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
            quickStamp,
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
      <div className="bg-white dark:bg-[#091510] border-2 border-slate-200 dark:border-emerald-500/30 w-full max-w-7xl xl:max-w-[94vw] 2xl:max-w-[1700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Expandido con Datos del Trámite */}
        <div className="px-6 sm:px-8 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/90 dark:bg-[#060f0b] flex-wrap gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-emerald-950 dark:text-emerald-300 bg-emerald-500/20 px-3 py-0.5 rounded-xl border border-emerald-500/40 tracking-wider">
                  {item.hrCode}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-gray-400 bg-slate-200/60 dark:bg-white/5 px-2.5 py-0.5 rounded-lg border border-slate-300 dark:border-white/10">
                  CITE: {item.cite || 'S/N'}
                </span>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  Custodia: {item.currentArea}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1 truncate">
                <Stamp className="w-5 h-5 text-brand-gold shrink-0" />
                <span className="truncate">Nuevo Proveído & Derivación Formal: {item.reference}</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body - 3 Columns on Desktop */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-7 overflow-y-auto flex-1 space-y-6 text-sm">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 xl:gap-6">
            
            {/* Left Column: Destino Principal & Con Copia (C.C.) */}
            <div className="space-y-6">
              
              {/* 1. Destino Principal Parametrizado por Organigrama */}
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-gold" />
                    <span>1. Derivar a (Destino Organigrama CHLS)</span>
                    <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                    Línea de Mando
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Alerta si no hay conexiones en el organigrama */}
                  {organigramInfo.recommendedNodes.length === 0 && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <div>
                        <span className="font-black block">Sin líneas de derivación conectadas:</span>
                        <span className="text-[11px] text-red-600 dark:text-red-400">
                          {item.currentArea} no tiene conectores activos en el Organigrama 360°. Para habilitar destinos, traza sus líneas en <em>Organigrama & Flujos</em>.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Selector EXCLUSIVO de Destinos Conectados en el Organigrama */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                      Destino Autorizado por Conexión
                    </label>
                    <select
                      value={targetArea}
                      disabled={organigramInfo.recommendedNodes.length === 0}
                      onChange={(e) => {
                        const selArea = e.target.value;
                        const found = organigramInfo.recommendedNodes.find(r => r.node.title === selArea);
                        if (found) {
                          handleSelectNode(found.node);
                        } else {
                          setTargetArea(selArea);
                        }
                      }}
                      className="w-full bg-white dark:bg-[#070e0a] border-2 border-slate-300 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-xs disabled:opacity-50"
                    >
                      {organigramInfo.recommendedNodes.length > 0 ? (
                        organigramInfo.recommendedNodes.map(({ node, edgeLabel, direction }) => (
                          <option key={node.id} value={node.title} className="bg-slate-900 text-white">
                            {direction === 'DOWN' ? '↓' : '↑'} {node.title} — {node.manager || 'Titular'} ({edgeLabel})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          ⛔ Sin conexiones autorizadas en el Organigrama
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                        Responsable / Titular de Despacho
                      </label>
                      <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-bold">
                        Persona Asignada
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre y cargo del responsable..."
                      value={targetPersonName}
                      onChange={(e) => setTargetPersonName(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Con Copia a (C.C. Informativo con Lista Desplegable) */}
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200 flex items-center gap-2">
                    <Copy className="w-4 h-4 text-brand-gold" />
                    <span>2. Con Copia a (C.C. Informativo)</span>
                  </span>
                  {selectedCcAreas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                        {selectedCcAreas.length} {selectedCcAreas.length === 1 ? 'área' : 'áreas'} con copia
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCcAreas([])}
                        className="text-[10px] text-red-500 hover:text-red-400 font-bold hover:underline cursor-pointer"
                      >
                        Limpiar todo
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Busca o despliega la lista para seleccionar las áreas que deben recibir copia informativa de este trámite:
                </p>

                {/* Combobox con Buscador Integrado y Menú Desplegable */}
                <div ref={ccDropdownRef} className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="🔍 Buscar o desplegar área para copia C.C. ..."
                      value={searchCcTerm}
                      onFocus={() => setIsCcDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchCcTerm(e.target.value);
                        setIsCcDropdownOpen(true);
                      }}
                      className="w-full bg-white dark:bg-[#070e0a] border-2 border-slate-300 dark:border-white/10 rounded-2xl pl-11 pr-11 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCcDropdownOpen((prev) => !prev)}
                      className="absolute right-3 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title={isCcDropdownOpen ? 'Cerrar lista' : 'Abrir lista desplegable'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCcDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                    </button>
                  </div>

                  {/* Panel Desplegable Flotante */}
                  {isCcDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-60 overflow-y-auto bg-white dark:bg-[#081510] border-2 border-emerald-500/40 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-fadeIn backdrop-blur-md">
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
                            className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-gray-200 hover:bg-emerald-500/20 hover:text-emerald-950 dark:hover:text-emerald-300 flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <span className="truncate">{area}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0 ml-2">
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
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Áreas que recibirán copia (haz clic en ✕ para remover):
                    </span>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-100/80 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/10">
                      {selectedCcAreas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-950 dark:text-emerald-300 text-xs font-black border border-emerald-500/40 shadow-xs transition-all"
                        >
                          <span>{area}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCcAreas((prev) => prev.filter((a) => a !== area))}
                            title="Quitar copia a esta área"
                            className="w-4 h-4 rounded-full bg-emerald-600/30 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-[11px] font-bold"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100/50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                    <span className="text-xs text-slate-400 italic">
                      Sin áreas con copia seleccionadas. Elige del menú desplegable superior si deseas notificar en paralelo.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                    Personas o Cargos Específicos en C.C. (Opcional)
                  </label>
                  <SmartCorrespondenceInput
                    placeholder="Ej. Asesoría Legal Externa, Auditoría Interna, etc."
                    value={ccPersonsText}
                    onChange={(e) => setCcPersonsText(e.target.value)}
                    className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-950 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-gold shadow-xs"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Sellos, Instrucción & Estado */}
            <div className="space-y-6">
              
              {/* 3. Sellos Frecuentes de 1 Toque */}
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-3.5 shadow-sm">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-brand-gold" />
                  <span>3. Sellos Frecuentes de 1 Toque</span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_STAMPS.map((stamp) => (
                    <button
                      key={stamp}
                      type="button"
                      onClick={() => handleSelectStamp(stamp)}
                      className={`text-xs font-bold px-3.5 py-2.5 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-2 cursor-pointer ${
                        quickStamp === stamp
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 scale-[1.02]'
                          : 'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-500'
                      }`}
                    >
                      <span className="truncate">{stamp}</span>
                      {quickStamp === stamp && <Check className="w-4 h-4 text-white stroke-[3] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Instrucción / Proveído */}
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-gold" />
                    <span>4. Instrucción / Proveído del Trámite</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-brand-gold font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Autocorrector de acentos & Predicción activa</span>
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
                  className="w-full bg-white dark:bg-[#070e0a] border-2 border-slate-300 dark:border-white/10 rounded-2xl p-4 text-slate-950 dark:text-white font-medium text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none leading-relaxed shadow-xs"
                />

                {/* 5. Digitalizar / Adjuntar Documento de Respuesta / Informe Técnico */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-brand-gold" />
                      <span>5. Digitalizar / Adjuntar Documento Oficial (PDF)</span>
                    </label>
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">
                      Solo PDF
                    </span>
                  </div>

                  <label className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 p-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-xs">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-brand-gold group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-black/60 border border-emerald-500/40 text-xs font-bold text-slate-900 dark:text-gray-200 shadow-xs"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[170px] sm:max-w-[210px]">{file.name}</span>
                            <span className="text-[10px] font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                              {pages} {pages === 1 ? 'hoja' : 'hojas'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-0.5 ml-0.5 cursor-pointer"
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
                    <div className="bg-emerald-500/10 dark:bg-black/60 border-2 border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 shrink-0">
                          <FileText className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                              Cantidad de Hojas Adjuntas
                            </span>
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Conteo Automático Protegido</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Total de páginas auditadas en {movementFiles.length} archivo(s) PDF (no modificable manualmente)
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 shrink-0 bg-white dark:bg-[#07110c] px-3.5 py-2 rounded-xl border-2 border-emerald-500/50 shadow-inner select-none cursor-not-allowed"
                        title="Conteo automatizado por lectura digital de PDF. No modificable manualmente."
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="w-10 text-center font-mono font-black text-base text-slate-950 dark:text-emerald-300">
                          {attachedPages}
                        </span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
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
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-2 shadow-sm">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200">
                  5. Nuevo Estado de la Hoja de Ruta
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border-2 border-slate-300 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-black text-sm focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none shadow-xs"
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
              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-amber-500/10 p-5 rounded-3xl border border-emerald-500/30 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Resumen Oficial de Derivación</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    HR: {item.hrCode}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-gray-400">Área Emisora:</span>
                    <strong className="text-slate-900 dark:text-white">{item.currentArea}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-gray-400">Área Destino:</span>
                    <strong className="text-emerald-700 dark:text-brand-gold">{targetArea || 'Sin seleccionar'}</strong>
                  </div>

                  {targetPersonName && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                      <span className="text-slate-500 dark:text-gray-400">Responsable:</span>
                      <span className="text-slate-800 dark:text-gray-200 font-bold">{targetPersonName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-gray-400">Copias C.C.:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedCcAreas.length > 0 ? `${selectedCcAreas.length} área(s)` : 'Ninguna'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-gray-400">Adjuntos PDF:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {movementFiles.length > 0 ? `${movementFiles.length} archivo(s)` : 'Sin adjuntos'}
                    </span>
                  </div>

                  {movementFiles.length > 0 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                      <span className="text-slate-500 dark:text-gray-400">Hojas Adjuntas:</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        + {attachedPages} {attachedPages === 1 ? 'hoja / foja' : 'hojas / fojas'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/5">
                    <span className="text-slate-500 dark:text-gray-400">Fojas Totales HR:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.pageCount || 1} {attachedPages > 0 ? `➔ ${(item.pageCount || 1) + attachedPages} fojas` : 'fojas'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-gray-400">Firma Digital:</span>
                    <span className={`font-black text-[11px] px-2.5 py-0.5 rounded-lg ${
                      signatureUrl
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                    }`}>
                      {signatureUrl ? '✓ Registrada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Action Buttons */}
          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetArea || organigramInfo.recommendedNodes.length === 0}
              className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-5 h-5 text-slate-950" />
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
