import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { createRouteSheet, analyzeTextWithAi, uploadRouteSheetDocuments } from '@store/correspondenceSlice';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';

interface NewRouteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  'SECRETARÍA GENERAL': { title: 'Secretaría de Gerencia General', defaultPerson: 'Lic. María del Pilar Atanacio (Secretaria de Gerencia)' },
  'GERENCIA GENERAL': { title: 'Gerencia General / MAE', defaultPerson: 'Ing. Gerente General CHLS' },
  'TESORERÍA Y FINANZAS': { title: 'Jefatura de Tesorería y Finanzas', defaultPerson: 'Lic. Jefe de Finanzas & Tesorería' },
  'CONTRATACIONES Y ADQUISICIONES': { title: 'Responsable de Compras & Contrataciones', defaultPerson: 'Lic. Encargado de Adquisiciones' },
  'COMISIÓN HÍPICA': { title: 'Capitanía Hípica & Área Ecuestre', defaultPerson: 'Capitán de Comisión Hípica' },
  'CAPITANÍA DEPORTES / TENIS': { title: 'Capitanía de Deportes & Tenis', defaultPerson: 'Capitán de Deportes' },
  'ASESORÍA LEGAL': { title: 'Asesoría Jurídica Institucional', defaultPerson: 'Dr. Asesor Legal Principal' },
  'MANTENIMIENTO Y OBRAS': { title: 'Jefatura de Infraestructura y Mantenimiento', defaultPerson: 'Ing. Jefe de Mantenimiento' },
  'DIRECTORIO / PRESIDENCIA': { title: 'Directorio / Presidencia CHLS', defaultPerson: 'Directorio CHLS' },
  'ALMACÉN': { title: 'Encargado de Almacén & Suministros', defaultPerson: 'Responsable de Almacén' },
  'SISTEMAS E INFORMÁTICA': { title: 'Jefatura de Sistemas & TI', defaultPerson: 'Ing. Administrador de Sistemas' },
  'RECURSOS HUMANOS': { title: 'Jefatura de Talento Humano', defaultPerson: 'Lic. Responsable de RRHH' },
};

const QUICK_STAMPS = [
  'FAVOR SU ATENCIÓN Y TRÁMITE',
  'FAVOR REALIZAR EL PAGO',
  'PARA INFORME TÉCNICO / LEGAL',
  'PARA SU CONOCIMIENTO Y FINES',
  'PARA VISTO BUENO / AUTORIZACIÓN',
  'ARCHIVAR ANTECEDENTES',
];

export const NewRouteSheetModal: React.FC<NewRouteSheetModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSaving } = useSelector((state: RootState) => state.correspondence);

  const [senderType, setSenderType] = useState<'AREA_INTERNA' | 'SOCIO' | 'EXTERNO'>('AREA_INTERNA');
  const [senderName, setSenderName] = useState('');
  const [senderArea, setSenderArea] = useState('ALMACÉN');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderDoc, setSenderDoc] = useState('');
  const [cite, setCite] = useState('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [reference, setReference] = useState('');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'ALTA' | 'URGENTE'>('NORMAL');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  // Initial instruction & C.C.
  const [hasInitialInstruction, setHasInitialInstruction] = useState(true);
  const [initialTargetArea, setInitialTargetArea] = useState('CONTRATACIONES Y ADQUISICIONES');
  const [initialTargetPerson, setInitialTargetPerson] = useState('');
  const [initialCcAreas, setInitialCcAreas] = useState<string[]>([]);
  const [initialCcPersons, setInitialCcPersons] = useState('');
  const [initialQuickStamp, setInitialQuickStamp] = useState('FAVOR SU ATENCIÓN Y TRÁMITE');
  const [initialInstruction, setInitialInstruction] = useState('Favor su atención y trámite correspondiente.');

  // AI state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ summary?: string; suggestedArea?: string; suggestedPriority?: string } | null>(null);

  if (!isOpen) return null;

  const handleAiSuggest = async () => {
    if (!reference || reference.trim().length < 5) {
      toast.error('Ingresa al menos 5 caracteres en el asunto para que la IA analice.');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
      aiSummary: aiSuggestion?.summary || null,
      suggestedArea: aiSuggestion?.suggestedArea || null,
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
                Club Hípico Los Sargentos — Secretaría de Gerencia General
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
                      onClick={() => { setSenderType('AREA_INTERNA'); setSenderArea('ALMACÉN'); }}
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
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                        Área / Departamento Remitente
                      </label>
                      <select
                        value={senderArea}
                        onChange={(e) => setSenderArea(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-black text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs cursor-pointer"
                      >
                        {CHLS_INTERNAL_AREAS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                        {senderType === 'SOCIO' ? 'N° de Acción / CI' : 'Empresa / Institución Externa'}
                      </label>
                      <input
                        type="text"
                        placeholder={senderType === 'SOCIO' ? 'Ej. Acción 142 o 4892110 LP' : 'Ej. DELAPAZ, EPSAS, Banco Bisa'}
                        value={senderDoc}
                        onChange={(e) => setSenderDoc(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                      Nombre Completo del Remitente <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Ing. Carlos Mendoza o María del Pilar"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                      Teléfono / WhatsApp de Contacto (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 77218940"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300">
                        Correo Electrónico (Notificación)
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-brand-gold font-bold">
                        Acuse Digital
                      </span>
                    </div>
                    <input
                      type="email"
                      placeholder="Ej. socio@gmail.com o empresa@proveedor.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
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
                              : 'bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-gray-400 border-slate-300 dark:border-white/10 hover:bg-slate-200'
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
              <div className="bg-white/95 dark:bg-[#0c1a13] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-lg shadow-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <h2 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Asunto & Documento de Origen
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={isAnalyzingAi}
                    className="flex items-center gap-2 text-xs font-black text-purple-700 dark:text-purple-300 hover:text-purple-900 bg-purple-500/15 dark:bg-purple-950/60 px-4 py-1.5 rounded-full border border-purple-500/40 shadow-sm transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 text-purple-600 dark:text-purple-400 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingAi ? 'Analizando...' : '✨ Sugerir con IA'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                      CITE / N° de Nota o Informe
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. ALM-INF N° 42/2026"
                      value={cite}
                      onChange={(e) => setCite(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                      N° de Fojas / Folios
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
                      <input
                        type="number"
                        min="1"
                        value={pageCount}
                        onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 1)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl text-slate-950 dark:text-white font-mono font-black text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                    Referencia / Asunto Principal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="EJ. SOLICITUD DE ADQUISICIÓN DE ARENA Y MANTENIMIENTO PARA PISTAS DE SALTO HÍPICO"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-4 text-slate-950 dark:text-white font-black uppercase text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                    Descripción de Documentos Adjuntos / Anexos
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Formulario de Requerimiento + 3 Cotizaciones de Proveedores (5 fojas)"
                    value={attachmentDescription}
                    onChange={(e) => setAttachmentDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                  />
                </div>

                {/* Digitalización & Carga de Archivos (Eco-Híbrido) */}
                <div className="pt-2 border-t border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Digitalizar & Adjuntar Archivos (PDF, Fotos, Comprobantes)</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Eco-Híbrido Cero Papel
                    </span>
                  </div>

                  {/* Dropzone Container */}
                  <label className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 p-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <UploadCloud className="w-7 h-7 text-emerald-600 dark:text-brand-gold mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Arrastra archivos aquí o <span className="text-emerald-700 dark:text-brand-gold underline">haz clic para examinar</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                      Soporta PDF escaneados, imágenes de celulares, Word y Excel (hasta 25 MB por archivo)
                    </span>
                  </label>

                  {/* Preview Selected Files Chips */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-gray-400 block">
                        Archivos listos para digitalizar ({selectedFiles.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-emerald-500/40 text-xs font-bold text-slate-900 dark:text-gray-200 shadow-xs"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors ml-1 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
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
                    
                    {/* Destino y Funcionario */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                          Área de Destino Principal <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={initialTargetArea}
                          onChange={(e) => {
                            const newArea = e.target.value;
                            setInitialTargetArea(newArea);
                            if (AREA_RESPONSIBLES[newArea]) {
                              setInitialTargetPerson(AREA_RESPONSIBLES[newArea].defaultPerson);
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-black text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs cursor-pointer"
                        >
                          {CHLS_INTERNAL_AREAS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300">
                            Responsable / Jefatura de Despacho
                          </label>
                          <span className="text-[10px] text-emerald-700 dark:text-brand-gold font-black">
                            Titular
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Ej. Lic. Ian Pinto / Arq. Laura Ríos"
                          value={initialTargetPerson}
                          onChange={(e) => setInitialTargetPerson(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-950 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                        />
                      </div>
                    </div>

                    {/* CON COPIA A (C.C. MULTI-DESTINATARIOS) */}
                    <div className="bg-slate-100/80 dark:bg-[#060e0a] p-4 rounded-2xl border-2 border-slate-200 dark:border-emerald-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200 flex items-center gap-2">
                          <Copy className="w-4 h-4 text-brand-gold" />
                          <span>Con Copia a (C.C. Informativo):</span>
                        </label>
                        {initialCcAreas.length > 0 && (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                            {initialCcAreas.length} en copia
                          </span>
                        )}
                      </div>

                      {/* Chips de selección de áreas en C.C. */}
                      <div className="flex flex-wrap gap-2">
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
                              className={`text-xs font-black px-3.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 scale-[1.03]'
                                  : 'bg-white dark:bg-white/5 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-white/10 hover:border-emerald-500 hover:bg-slate-50'
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
                          placeholder="Personas o entidades adicionales en C.C. (ej. Asesoría Legal, Auditoría Externa)"
                          value={initialCcPersons}
                          onChange={(e) => setInitialCcPersons(e.target.value)}
                          className="w-full bg-white dark:bg-[#07110c] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-950 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                        Instrucción Oficial / Proveído Detallado <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={initialInstruction}
                        onChange={(e) => setInitialInstruction(e.target.value)}
                        required
                        placeholder="Redacta la instrucción formal para el área de destino..."
                        className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-4 text-slate-950 dark:text-white font-medium text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs leading-relaxed"
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
