import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';
import CrestLogo from '@shared/components/CrestLogo';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';
import { getOrganigramDestinations, WorkflowNode, DEFAULT_ORGANIGRAM_NODES } from '../utils/organigramWorkflowService';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchCcTerm, setSearchCcTerm] = useState('');
  const [searchDestinationTerm, setSearchDestinationTerm] = useState('');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setMovementFiles((prev) => [...prev, ...validPdfFiles]);
      }
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setMovementFiles((prev) => prev.filter((_, i) => i !== index));
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
        // Upload documents attached to this movement/route sheet (strictly PDF)
        if (movementFiles.length > 0) {
          toast.loading('Subiendo y digitalizando documentos adjuntos en PDF...', { id: toastId });
          try {
            await dispatch(
              uploadRouteSheetDocuments({
                routeSheetId: item.id,
                files: movementFiles,
                isDerivation: true,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border-2 border-slate-200 dark:border-emerald-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/80 dark:bg-black/30">
          <div className="flex items-center gap-3.5">
            <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-black text-emerald-950 dark:text-emerald-300 bg-emerald-500/20 dark:bg-emerald-950/80 px-3 py-0.5 rounded-xl border border-emerald-500/40 tracking-wider">
                  {item.hrCode}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-gray-400 truncate max-w-sm hidden sm:inline">
                  • {item.reference}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Stamp className="w-5 h-5 text-brand-gold shrink-0" />
                <span>Nuevo Proveído / Derivación Formal</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body - 2 Columns on Desktop */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-sm">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
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

              {/* 2. Con Copia a (C.C. Informativo Limpio con Búsqueda) */}
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200 flex items-center gap-2">
                    <Copy className="w-4 h-4 text-brand-gold" />
                    <span>2. Con Copia a (C.C. Informativo)</span>
                  </span>
                  {selectedCcAreas.length > 0 && (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                      {selectedCcAreas.length} {selectedCcAreas.length === 1 ? 'área' : 'áreas'} seleccionadas
                    </span>
                  )}
                </div>

                {/* Badges de C.C. seleccionadas */}
                {selectedCcAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/10">
                    {selectedCcAreas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-900 dark:text-brand-gold text-xs font-bold border border-emerald-500/40"
                      >
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCcAreas((prev) => prev.filter((a) => a !== area))}
                          className="hover:text-red-500 cursor-pointer font-black"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Buscador de C.C. */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar área para copia C.C. (ej. Asesoría, Contabilidad, Presidencia)..."
                      value={searchCcTerm}
                      onChange={(e) => setSearchCcTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  {searchCcTerm.trim().length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-white dark:bg-[#070e0a] rounded-xl border border-slate-200 dark:border-white/10 shadow-lg">
                      {organigramInfo.allNodes
                        .filter((n) => n.title.toLowerCase().includes(searchCcTerm.toLowerCase()) && n.title !== targetArea)
                        .map((n) => {
                          const isAlreadyAdded = selectedCcAreas.includes(n.title);
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                if (isAlreadyAdded) {
                                  setSelectedCcAreas((prev) => prev.filter((a) => a !== n.title));
                                } else {
                                  setSelectedCcAreas((prev) => [...prev, n.title]);
                                }
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                                isAlreadyAdded
                                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300'
                              }`}
                            >
                              <span>{n.title}</span>
                              {isAlreadyAdded ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <span className="text-[10px] text-brand-gold">+ Añadir</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Selecciona con un toque las áreas que deben recibir copia informativa del expediente:
                </p>

                {/* Chips de Selección de Áreas en C.C. */}
                <div className="flex flex-wrap gap-2">
                  {allAvailableAreas.filter((a) => a !== targetArea).map((area) => {
                    const isSelected = selectedCcAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCcAreas((prev) => prev.filter((a) => a !== area));
                          } else {
                            setSelectedCcAreas((prev) => [...prev, area]);
                          }
                        }}
                        className={`text-xs font-bold px-3.5 py-2 rounded-2xl border-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/25 text-emerald-950 dark:text-emerald-200 border-emerald-500 shadow-md shadow-emerald-500/15 scale-[1.02]'
                            : 'bg-white dark:bg-black/30 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10 hover:border-emerald-500/50'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-200 dark:bg-white/10'}`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                        <span>{area}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                    Personas o Cargos Específicos en C.C.
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

                {/* Adjuntar Documento de Respuesta / Informe Técnico */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Adjuntar Documento Digitalizado de Respuesta / Informe</span>
                    </label>
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">
                      Solo PDF
                    </span>
                  </div>

                  <label className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 p-3.5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-brand-gold mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-800 dark:text-gray-200">
                      Adjuntar Informe, Dictamen o Comprobante (Exclusivo formato PDF)
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      En las derivaciones únicamente se admiten archivos .pdf
                    </span>
                  </label>

                  {/* Chips of attached files */}
                  {movementFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {movementFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white dark:bg-black/50 border border-emerald-500/40 text-xs font-bold text-slate-900 dark:text-gray-200 shadow-xs"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
