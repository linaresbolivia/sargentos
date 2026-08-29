import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { createRouteSheet, analyzeTextWithAi } from '@store/correspondenceSlice';
import { X, Sparkles, Building2, User, Truck, FileText, Send, Check, ShieldAlert, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';

interface NewRouteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHLS_INTERNAL_AREAS = [
  'ALMACÉN',
  'SECRETARÍA GENERAL',
  'GERENCIA GENERAL',
  'COMISIÓN HÍPICA',
  'CAPITANÍA DEPORTES / TENIS',
  'TESORERÍA Y FINANZAS',
  'CONTRATACIONES Y ADQUISICIONES',
  'ASESORÍA LEGAL',
  'MANTENIMIENTO Y OBRAS',
  'DIRECTORIO / PRESIDENCIA',
  'SISTEMAS E INFORMÁTICA',
  'RECURSOS HUMANOS',
];

const QUICK_STAMPS = [
  'FAVOR SU ATENCIÓN',
  'FAVOR REALIZAR EL PAGO',
  'PARA INFORME TÉCNICO / LEGAL',
  'PARA SU CONOCIMIENTO Y FINES',
  'PARA VISTO BUENO / AUTORIZACIÓN',
];

export const NewRouteSheetModal: React.FC<NewRouteSheetModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSaving } = useSelector((state: RootState) => state.correspondence);

  const [senderType, setSenderType] = useState<'AREA_INTERNA' | 'SOCIO' | 'EXTERNO'>('AREA_INTERNA');
  const [senderName, setSenderName] = useState('');
  const [senderArea, setSenderArea] = useState('ALMACÉN');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderDoc, setSenderDoc] = useState('');
  const [cite, setCite] = useState('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [reference, setReference] = useState('');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');

  // Initial instruction & C.C.
  const [hasInitialInstruction, setHasInitialInstruction] = useState(true);
  const [initialTargetArea, setInitialTargetArea] = useState('CONTRATACIONES Y ADQUISICIONES');
  const [initialTargetPerson, setInitialTargetPerson] = useState('');
  const [initialCcAreas, setInitialCcAreas] = useState<string[]>([]);
  const [initialCcPersons, setInitialCcPersons] = useState('');
  const [initialQuickStamp, setInitialQuickStamp] = useState('FAVOR SU ATENCIÓN');
  const [initialInstruction, setInitialInstruction] = useState('Favor su atención y trámite correspondiente.');

  // AI state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ summary?: string; suggestedArea?: string; suggestedPriority?: string } | null>(null);

  if (!isOpen) return null;

  const handleAiSuggest = async () => {
    if (!reference || reference.trim().length < 5) {
      toast.error('Ingresa al menos 5 caracteres en la referencia para que la IA pueda analizar.');
      return;
    }

    setIsAnalyzingAi(true);
    try {
      const resultAction = await dispatch(analyzeTextWithAi(reference));
      if (analyzeTextWithAi.fulfilled.match(resultAction)) {
        const data = resultAction.payload;
        setAiSuggestion(data);
        if (data.suggestedArea) {
          setInitialTargetArea(data.suggestedArea);
        }
        if (data.suggestedPriority) {
          setPriority(data.suggestedPriority as any);
        }
        toast.success('✨ Sugerencia inteligente aplicada');
      }
    } catch {
      toast.error('No se pudo completar el análisis asistivo');
    } finally {
      setIsAnalyzingAi(false);
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

    const payload = {
      senderType,
      senderName: senderName.trim(),
      senderArea: senderType === 'AREA_INTERNA' ? senderArea : null,
      senderPhone: senderPhone.trim() || null,
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
      aiSummary: aiSuggestion?.summary || null,
      suggestedArea: aiSuggestion?.suggestedArea || null,
    };

    const action = await dispatch(createRouteSheet(payload));
    if (createRouteSheet.fulfilled.match(action)) {
      toast.success(`Hoja de Ruta ${action.payload.hrCode} generada con éxito 🎉`);
      onClose();
    } else {
      toast.error('Error al generar la Hoja de Ruta');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border border-slate-200 dark:border-brand-gold/20 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Crest Logo */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Nueva Hoja de Ruta
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  Radicación 360°
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Club Hípico Los Sargentos — Secretaría de Gerencia General
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Sender Type Switcher (Apple Segmented Control) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-2">
              1. Tipo de Remitente
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => { setSenderType('AREA_INTERNA'); setSenderArea('ALMACÉN'); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                  senderType === 'AREA_INTERNA'
                    ? 'bg-white dark:bg-[#1a2920] text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Área Interna</span>
              </button>

              <button
                type="button"
                onClick={() => { setSenderType('SOCIO'); setSenderArea(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                  senderType === 'SOCIO'
                    ? 'bg-white dark:bg-[#1a2920] text-brand-gold shadow-sm border border-brand-gold/30'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Socio / Familiar</span>
              </button>

              <button
                type="button"
                onClick={() => { setSenderType('EXTERNO'); setSenderArea(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                  senderType === 'EXTERNO'
                    ? 'bg-white dark:bg-[#1a2920] text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Externo / Courier</span>
              </button>
            </div>
          </div>

          {/* Sender Data Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/90 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/90 dark:border-white/5">
            {senderType === 'AREA_INTERNA' ? (
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                  Empresa / Área Remitente
                </label>
                <select
                  value={senderArea}
                  onChange={(e) => setSenderArea(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-bold focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
                >
                  {CHLS_INTERNAL_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                  {senderType === 'SOCIO' ? 'N° de Acción / CI' : 'Empresa / Entidad Externa'}
                </label>
                <input
                  type="text"
                  placeholder={senderType === 'SOCIO' ? 'Ej. 142 o 4892110 LP' : 'Ej. DHL, Banco Bisa, Alcaldía'}
                  value={senderDoc}
                  onChange={(e) => setSenderDoc(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                Remite (Nombre Completo) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. María del Pilar Atanacio"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
              />
            </div>
          </div>

          {/* Reference & CITE Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                2. Asunto & Documentación de Origen
              </label>
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isAnalyzingAi}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingAi ? 'Analizando...' : '✨ Sugerir con IA'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                  CITE / N° de Nota o Informe
                </label>
                <input
                  type="text"
                  placeholder="Ej. ALM-INF N° 42/2026"
                  value={cite}
                  onChange={(e) => setCite(e.target.value)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-mono font-bold focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                  N° de Páginas / Folios
                </label>
                <input
                  type="number"
                  min="1"
                  value={pageCount}
                  onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-mono font-bold focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                Referencia / Asunto Principal <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Ej. SOLICITUD DE RECARGA PARA TONER Y COMPRA DE TINTAS PARA IMPRESORAS"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-black focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none uppercase shadow-xs text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                Adjunto (Descripción de Anexos)
              </label>
              <input
                type="text"
                placeholder="Ej. KARDEX CRONOLÓGICO CONSOLIDADO (2 FOJAS)"
                value={attachmentDescription}
                onChange={(e) => setAttachmentDescription(e.target.value)}
                className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none uppercase shadow-xs"
              />
            </div>
          </div>

          {/* Initial Instruction / Proveído Section */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-gray-300 flex items-center gap-2">
                <span>3. Primer Proveído / Derivación Inmediata</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={hasInitialInstruction}
                  onChange={(e) => setHasInitialInstruction(e.target.checked)}
                  className="rounded text-brand-gold focus:ring-brand-gold"
                />
                <span>Derivar de inmediato</span>
              </label>
            </div>

            {hasInitialInstruction && (
              <div className="bg-slate-50/90 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/90 dark:border-white/5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                      A: Área de Destino
                    </label>
                    <select
                      value={initialTargetArea}
                      onChange={(e) => setInitialTargetArea(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-bold focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
                    >
                      {CHLS_INTERNAL_AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                      Destinatario Específico (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Lic. Ian Pinto"
                      value={initialTargetPerson}
                      onChange={(e) => setInitialTargetPerson(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs"
                    />
                  </div>
                </div>

                {/* Con Copia a (C.C. Multi-Destinatarios) */}
                <div className="bg-white/80 dark:bg-black/30 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-300 flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Con Copia a (C.C. Informativo):</span>
                    </label>
                    {initialCcAreas.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                        {initialCcAreas.length} {initialCcAreas.length === 1 ? 'área' : 'áreas'} en copia
                      </span>
                    )}
                  </div>

                  {/* Chips de Selección de Áreas en C.C. */}
                  <div className="flex flex-wrap gap-1.5">
                    {CHLS_INTERNAL_AREAS.filter((a) => a !== initialTargetArea).map((area) => {
                      const isSelected = initialCcAreas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setInitialCcAreas((prev) => prev.filter((a) => a !== area));
                            } else {
                              setInitialCcAreas((prev) => [...prev, area]);
                            }
                          }}
                          className={`text-[10.5px] font-bold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500 shadow-xs scale-[1.02]'
                              : 'bg-white dark:bg-white/5 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-white/10 hover:border-emerald-500/50'
                          }`}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{area}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Nombres o cargos adicionales en C.C. (ej. Asesoría Legal, Auditoría Externa)"
                      value={initialCcPersons}
                      onChange={(e) => setInitialCcPersons(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-950 dark:text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-brand-gold shadow-xs"
                    />
                  </div>
                </div>

                {/* Quick stamps */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                    Sello Rápido
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_STAMPS.map((stamp) => (
                      <button
                        key={stamp}
                        type="button"
                        onClick={() => {
                          setInitialQuickStamp(stamp);
                          setInitialInstruction(stamp + ': Favor proceder conforme a reglamento.');
                        }}
                        className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-all ${
                          initialQuickStamp === stamp
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
                            : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
                        }`}
                      >
                        {stamp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instruction Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-gray-300 mb-1">
                    Instrucción / Proveído Detallado
                  </label>
                  <textarea
                    rows={2}
                    value={initialInstruction}
                    onChange={(e) => setInitialInstruction(e.target.value)}
                    className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-950 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none shadow-xs text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black font-black px-6 py-2.5 rounded-xl shadow-lg shadow-brand-gold/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSaving ? 'Generando...' : 'Generar Hoja de Ruta'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
export default NewRouteSheetModal;
