import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Send,
  Scroll,
  Briefcase,
  Globe,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  Calendar,
  AlertCircle,
  Hash,
  ArrowRight,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { citeService, resolveDepartmentToCiteAreaKey } from '../services/citeService';
import { OfficialArea, OfficialDocType } from '../types/cite.types';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';

interface GenerateCiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCiteCreated?: (citeCode: string, citeData: any) => void;
  initialDocType?: string;
  initialAreaKey?: string;
  initialSubject?: string;
  currentPerspective?: string;
  canAccessAllAreas?: boolean;
}

const DOC_MODELS_INFO = [
  {
    key: 'INF',
    name: 'INFORME',
    label: 'Informe Técnico',
    icon: FileText,
    desc: 'Evaluaciones técnicas, peritajes, rendición de cuentas o justificaciones formales con antecedentes, análisis y conclusiones.',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    key: 'CI',
    name: 'COMUNICACIÓN INTERNA',
    label: 'Nota / CI',
    icon: Send,
    desc: 'Solicitudes, avisos, coordinaciones administrativas y trámites formales entre departamentos y jefaturas internas.',
    badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  },
  {
    key: 'INST',
    name: 'INSTRUCTIVO',
    label: 'Instructivo',
    icon: Scroll,
    desc: 'Disposiciones normativas de obligatorio cumplimiento emitidas por Gerencia General o Jefaturas de Área.',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    key: 'MEM',
    name: 'MEMORÁNDUM',
    label: 'Memorándum',
    icon: Briefcase,
    desc: 'Designaciones, llamadas de atención, felicitaciones, asignaciones o comunicaciones directas de personal.',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
  {
    key: 'NE',
    name: 'CARTA EXTERNA',
    label: 'Nota Externa',
    icon: Globe,
    desc: 'Comunicaciones oficiales dirigidas a entidades bancarias, alcaldía, ministerios, empresas o proveedores externos.',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
];

export const GenerateCiteModal: React.FC<GenerateCiteModalProps> = ({
  isOpen,
  onClose,
  onCiteCreated,
  initialDocType = 'CI',
  initialAreaKey,
  initialSubject = '',
  currentPerspective,
  canAccessAllAreas = false,
}) => {
  const [areas, setAreas] = useState<OfficialArea[]>([]);
  const [docTypes, setDocTypes] = useState<OfficialDocType[]>([]);
  const [canSuperviseAll, setCanSuperviseAll] = useState<boolean>(canAccessAllAreas);
  const [allowedDocTypes, setAllowedDocTypes] = useState<string[]>(['INF', 'CI']);

  // Asignar área inicial según perspectiva o clave provista
  const initialResolvedArea = initialAreaKey || resolveDepartmentToCiteAreaKey(currentPerspective);
  const [selectedAreaKey, setSelectedAreaKey] = useState<string>(initialResolvedArea);
  const [selectedDocType, setSelectedDocType] = useState<string>(initialDocType);
  const [previewCode, setPreviewCode] = useState<string>(`CHLS-${initialResolvedArea}-CI-N° 001/2026`);

  // Form Fields with smart initial defaults
  const [recipient, setRecipient] = useState('Lic. Roberto Meneses');
  const [recipientRole, setRecipientRole] = useState('Gerente General CHLS');
  const [recipientEntity, setRecipientEntity] = useState('');
  const [senderName, setSenderName] = useState('Despacho Institucional');
  const [senderRole, setSenderRole] = useState(`Responsable de Área`);
  const [initials, setInitials] = useState(`${initialResolvedArea}/adm`);
  const [subject, setSubject] = useState(initialSubject || 'SOLICITUD Y COORDINACIÓN DE REQUERIMIENTOS DEL ÁREA');
  const [officialDate, setOfficialDate] = useState(new Date().toISOString().split('T')[0]);

  // Structured Content Sections
  const [antecedentes, setAntecedentes] = useState('');
  const [analisisTecnico, setAnalisisTecnico] = useState('');
  const [conclusiones, setConclusiones] = useState('');
  const [bodyTextGeneral, setBodyTextGeneral] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCite, setCreatedCite] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset or initialize default templates when docType changes or modal opens
  const applyDocTypeDefaults = (type: string) => {
    if (type === 'INF') {
      setRecipient('Lic. Roberto Meneses');
      setRecipientRole('Gerente General CHLS');
      setSubject('INFORME TÉCNICO DE EVALUACIÓN Y GESTIÓN OPERATIVA');
      setAntecedentes('En atención a los requerimientos institucionales y a las directrices de la gestión, se emite el presente informe técnico para evaluación de las actividades desarrolladas.');
      setAnalisisTecnico('Se procedió a la revisión minuciosa y peritaje del área respectiva, constatando la viabilidad operativa y técnica conforme a los estándares de calidad del Club.');
      setConclusiones('Por lo expuesto, se recomienda autorizar la continuidad del trámite y proceder a su derivación correspondiente para los fines consiguientes.');
    } else if (type === 'CI') {
      setRecipient('Lic. Roberto Meneses');
      setRecipientRole('Gerente General CHLS');
      setSubject('SOLICITUD Y COORDINACIÓN DE REQUERIMIENTOS DEL ÁREA');
      setBodyTextGeneral('Mediante la presente comunicación interna, me dirijo a su autoridad con el objeto de coordinar y solicitar su gentil atención a lo referido en el encabezado, a fin de garantizar el adecuado funcionamiento de las actividades del área.');
    } else if (type === 'INST') {
      setRecipient('A TODO EL PERSONAL DEPENDIENTE');
      setRecipientRole('Jefaturas y Unidades CHLS');
      setSubject('DIRECTRICES DE CUMPLIMIENTO OBLIGATORIO PARA EL PERSONAL DEL CLUB');
      setBodyTextGeneral('1. OBJETO: Normar las directrices de obligatorio cumplimiento para el personal.\n\n2. ALCANCE: Aplicable a todas las unidades dependientes del Club Hípico Los Sargentos.\n\n3. DISPOSICIÓN: Se instruye dar estricto cumplimiento a las directrices emitidas.');
    } else if (type === 'MEM') {
      setRecipient('Personal Asignado / Colaborador');
      setRecipientRole('Colaborador Dependiente CHLS');
      setSubject('ASIGNACIÓN DE FUNCIONES Y DIRECTRICES DE TRABAJO');
      setBodyTextGeneral('Mediante el presente Memorándum, se le comunica formalmente la disposición referida en el objeto, debiendo dar estricto cumplimiento en el marco de sus funciones y responsabilidades institucionales.');
    } else if (type === 'NE') {
      setRecipient('Señores Representantes Legales');
      setRecipientRole('Gerencia / Dirección');
      setRecipientEntity('Institución Externa / Proveedor');
      setSubject('COORDINACIÓN INTERINSTITUCIONAL Y SOLICITUD DE REQUERIMIENTOS');
      setBodyTextGeneral('Mediante la presente, tengo a bien dirigirme a su distinguida institución a objeto de poner en su conocimiento y coordinar las acciones correspondientes a la referencia, reiterando nuestra constante predisposición interinstitucional.');
    }
  };

  // When modal opens, initialize state
  useEffect(() => {
    if (!isOpen) return;
    setCreatedCite(null);
    if (!recipient || recipient === 'RESERVA / EN TRÁMITE') {
      applyDocTypeDefaults(selectedDocType);
    }
  }, [isOpen]);

  // Load Metadata y determinar restricciones normativas por área
  useEffect(() => {
    if (!isOpen) return;
    citeService
      .getMetadata()
      .then((data) => {
        setAreas(data.areas || []);
        setDocTypes(data.docTypes || []);

        const isSuper = data.canAccessAllAreas ?? canAccessAllAreas;
        setCanSuperviseAll(isSuper);

        // Si es un responsable de área, asignar estrictamente su propia área
        const userAssignedArea = data.userAreaKey || resolveDepartmentToCiteAreaKey(currentPerspective) || initialResolvedArea;
        
        if (!isSuper) {
          setSelectedAreaKey(userAssignedArea);
          const areaCfg = (data.areas || []).find((a) => a.key === userAssignedArea);
          const allowed = areaCfg?.allowedTypes || data.allowedDocTypesForUser || ['INF', 'CI'];
          setAllowedDocTypes(allowed);

          // Si el docType seleccionado no está permitido para el área, cambiar al primer permitido
          if (!allowed.includes(selectedDocType)) {
            setSelectedDocType(allowed[0] || 'CI');
          }
        } else {
          // Si tiene permisos 360, permitir seleccionar y usar el área inicial
          const targetArea = initialAreaKey || resolveDepartmentToCiteAreaKey(currentPerspective);
          setSelectedAreaKey(targetArea);
          const areaCfg = (data.areas || []).find((a) => a.key === targetArea);
          setAllowedDocTypes(areaCfg?.allowedTypes || ['INF', 'CI', 'INST', 'MEM', 'NE']);
        }
      })
      .catch((err) => {
        console.error('Error cargando metadata de CITEs:', err);
      });
  }, [isOpen, currentPerspective, canAccessAllAreas]);

  // Update Live Preview when Area or DocType changes
  useEffect(() => {
    if (!selectedAreaKey || !selectedDocType) return;
    citeService
      .getPreview(selectedAreaKey, selectedDocType, new Date().getFullYear())
      .then((res) => {
        if (res?.formattedCode) {
          setPreviewCode(res.formattedCode);
        }
      })
      .catch((err) => {
        console.warn('Error fetching preview:', err);
      });
  }, [selectedAreaKey, selectedDocType]);

  // When Area changes, update role, initials and allowed doc types automatically
  useEffect(() => {
    if (!selectedAreaKey) return;
    const matchedArea = areas.find((a) => a.key === selectedAreaKey);
    const areaTitle = matchedArea ? matchedArea.name : selectedAreaKey;
    setInitials(`${selectedAreaKey}/adm`);
    setSenderRole(`Responsable de ${areaTitle}`);
    if (matchedArea?.allowedTypes) {
      setAllowedDocTypes(matchedArea.allowedTypes);
      if (!matchedArea.allowedTypes.includes(selectedDocType)) {
        setSelectedDocType(matchedArea.allowedTypes[0] || 'CI');
      }
    }
  }, [selectedAreaKey, areas]);

  // Reset or initialize default templates when docType changes
  useEffect(() => {
    applyDocTypeDefaults(selectedDocType);
  }, [selectedDocType]);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`CITE copiado: ${code}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerate = async (downloadPdf: boolean = false) => {
    const isReservation = !downloadPdf;
    const targetStatus = isReservation ? 'RESERVADO' : 'EMITIDO';

    const finalRecipient = recipient.trim() || (
      selectedDocType === 'INST'
        ? 'A TODO EL PERSONAL DEPENDIENTE'
        : selectedDocType === 'NE'
        ? 'Señores Representantes Legales'
        : selectedDocType === 'MEM'
        ? 'Personal Dependiente'
        : (downloadPdf ? 'Lic. Roberto Meneses (Gerente General)' : 'RESERVA / EN TRÁMITE')
    );

    const finalSubject = subject.trim() || (
      downloadPdf
        ? (selectedDocType === 'INF'
            ? 'INFORME TÉCNICO DE EVALUACIÓN Y GESTIÓN OPERATIVA'
            : selectedDocType === 'INST'
            ? 'DIRECTRICES DE CUMPLIMIENTO OBLIGATORIO'
            : selectedDocType === 'MEM'
            ? 'ASIGNACIÓN DE FUNCIONES Y TRABAJO'
            : selectedDocType === 'NE'
            ? 'COORDINACIÓN INTERINSTITUCIONAL'
            : 'COMUNICACIÓN INTERNA Y COORDINACIÓN OPERATIVA')
        : 'RESERVA DE CITE CORRELATIVO'
    );

    const finalSenderName = senderName.trim() || 'Despacho Institucional';
    const finalSenderRole = senderRole.trim() || 'Funcionario CHLS';

    setIsSubmitting(true);
    try {
      let combinedBody = bodyTextGeneral;
      if (selectedDocType === 'INF') {
        combinedBody = `1. ANTECEDENTES\n${(antecedentes || 'En atención a los requerimientos institucionales, se emite el presente informe técnico para evaluación de las actividades desarrolladas.').trim()}\n\n2. ANÁLISIS TÉCNICO\n${(analisisTecnico || 'Se procedió a la revisión y peritaje correspondiente conforme a los estándares de calidad del Club.').trim()}\n\n3. CONCLUSIONES Y RECOMENDACIONES\n${(conclusiones || 'Por lo expuesto, se recomienda autorizar la continuidad del trámite para los fines consiguientes.').trim()}`;
      } else if (!combinedBody.trim()) {
        combinedBody = downloadPdf
          ? 'Mediante la presente nota oficial, se comunica a la autoridad lo referido en el objeto para los fines correspondientes.'
          : 'CITE reservado en el libro oficial para posterior redacción y radicación.';
      }

      const payload = {
        areaKey: selectedAreaKey,
        docType: selectedDocType,
        year: new Date(officialDate).getFullYear() || new Date().getFullYear(),
        recipient: finalRecipient,
        recipientRole: recipientRole.trim() || undefined,
        recipientEntity: recipientEntity.trim() || undefined,
        senderName: finalSenderName,
        senderRole: finalSenderRole,
        initials: initials.trim() || undefined,
        subject: finalSubject,
        bodyText: combinedBody.trim() || undefined,
        status: targetStatus as 'RESERVADO' | 'EMITIDO',
        officialDate,
      };

      const result = await citeService.createCite(payload);
      setCreatedCite(result);

      if (isReservation) {
        toast.success(`CITE Oficial ${result.citeCode} reservado con éxito`);
      } else {
        toast.success(`CITE Oficial ${result.citeCode} emitido con éxito`);
        await citeService.downloadCitePdf(result.id, `${result.citeCode.replace(/[\/\s°N]/g, '_')}.pdf`);
        toast.success('Documento PDF oficial descargado');
      }

      if (onCiteCreated) {
        onCiteCreated(result.citeCode, result);
      }
    } catch (err: any) {
      console.error('Error generando CITE:', err);
      toast.error(err?.response?.data?.error || err.message || 'Error al generar CITE');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07130E] border-2 border-emerald-500/50 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.35)] my-auto">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-emerald-500/30 flex justify-between items-center bg-slate-50/90 dark:bg-[#091A14]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Generador de CITE & Redactor de Notas Oficiales
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Instructivo JOFHR 022-2026
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-emerald-300/70 mt-0.5">
                Emisión de correlativos institucionales normados y maquetación reglamentaria de los 5 modelos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Si ya se creó el CITE, pantalla de éxito y descarga */}
          {createdCite ? (
            <div className="p-8 text-center space-y-5 bg-emerald-500/10 border border-emerald-500/40 rounded-3xl animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className={`text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                    createdCite.status === 'RESERVADO'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    {createdCite.status === 'RESERVADO' ? '• CITE Oficial Reservado' : '✓ CITE Oficial Emitido'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-black/50 px-5 py-2 rounded-2xl border border-emerald-500/40 shadow-inner">
                    {createdCite.citeCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(createdCite.citeCode)}
                    title="Copiar CITE al portapapeles"
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {createdCite.status === 'RESERVADO' ? (
                  <p className="text-xs text-amber-500/90 dark:text-amber-400/90 mt-2 font-medium max-w-md mx-auto">
                    El correlativo quedó reservado en el Libro Oficial. Ya puede utilizar el número o redactar el documento en cualquier momento.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-500/90 dark:text-emerald-400/90 mt-2 font-medium max-w-md mx-auto">
                    Documento emitido y registrado reglamentariamente según Instructivo JOFHR 022-2026.
                  </p>
                )}
              </div>

              <div className="max-w-md mx-auto text-xs text-slate-600 dark:text-slate-300 space-y-1 text-left bg-white dark:bg-[#06110D] p-4 rounded-2xl border border-emerald-500/20">
                <p><strong>Área Emisora:</strong> {createdCite.areaName} ({createdCite.areaKey})</p>
                <p><strong>Destino:</strong> {createdCite.recipient} {createdCite.recipientRole ? `— ${createdCite.recipientRole}` : ''}</p>
                <p><strong>Referencia:</strong> {createdCite.subject}</p>
                <p><strong>Quién lo utilizó:</strong> {createdCite.senderName} ({createdCite.senderRole})</p>
                <p><strong>Fecha Oficial:</strong> {new Date(createdCite.officialDate).toLocaleDateString('es-BO')}</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
                <button
                  onClick={() => citeService.downloadCitePdf(createdCite.id, `${createdCite.citeCode.replace(/[\/\s°N]/g, '_')}.pdf`)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Documento Oficial PDF</span>
                </button>

                <button
                  onClick={() => {
                    setCreatedCite(null);
                    setSubject('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Generar Otro CITE
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-black/40 hover:bg-slate-300 text-slate-800 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Selector de los 5 Modelos Oficiales */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  1. Seleccione uno de los 5 Modelos Oficiales (Instructivo JOFHR 022-2026):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {DOC_MODELS_INFO.map((m) => {
                    const isSelected = selectedDocType === m.key;
                    const isAllowed = allowedDocTypes.includes(m.key);
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          if (!isAllowed) {
                            toast.error(`El modelo ${m.name} está reservado para Gerencia General / JOFHR según el Instructivo JOFHR 022-2026`);
                            return;
                          }
                          setSelectedDocType(m.key);
                        }}
                        className={`p-3 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer relative ${
                          !isAllowed
                            ? 'opacity-40 bg-slate-100 dark:bg-black/20 text-slate-400 border-slate-300 dark:border-slate-800 cursor-not-allowed'
                            : isSelected
                            ? 'bg-gradient-to-br from-emerald-900 via-[#0a2318] to-[#06110D] border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400/40'
                            : 'bg-slate-50 dark:bg-[#06110D]/70 hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-emerald-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-200 dark:bg-[#0B1E17] text-slate-600 dark:text-emerald-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1">
                            {!isAllowed && (
                              <span title="No permitido para su área" className="p-1 rounded bg-rose-500/20 text-rose-400">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${m.badgeColor}`}>
                              {m.key}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{m.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-emerald-300/60 mt-0.5 line-clamp-2">
                            {!isAllowed ? 'Reservado GG / JOFHR' : m.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Área y Previsualización Dinámica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-emerald-800/30">
                {/* Selector de Área */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Área Emisora Responsable:</span>
                    </span>
                    {!canSuperviseAll && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        <span>Área Asignada Oficial</span>
                      </span>
                    )}
                  </label>

                  {canSuperviseAll ? (
                    <select
                      value={selectedAreaKey}
                      onChange={(e) => setSelectedAreaKey(e.target.value)}
                      className="w-full bg-white dark:bg-[#071510] border border-slate-300 dark:border-emerald-800/50 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                    >
                      {areas.map((a) => (
                        <option key={a.key} value={a.key} className="bg-white dark:bg-[#071510]">
                          [{a.key}] {a.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-[#050D09] border-2 border-emerald-500/40 rounded-xl px-4 py-2.5 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 mr-2">
                            [{selectedAreaKey}]
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {areas.find((a) => a.key === selectedAreaKey)?.name || selectedAreaKey}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-medium">
                        Correlativo reglamentario
                      </span>
                    </div>
                  )}
                </div>

                {/* Previsualizador de CITE Tentativo */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-emerald-400" />
                      <span>CITE Correlativo Asignado:</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold">Auto-secuencial</span>
                  </label>
                  <div className="flex items-center justify-between bg-white dark:bg-[#050D09] border-2 border-emerald-500/40 rounded-xl px-4 py-2 shadow-inner">
                    <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300 tracking-wide">
                      {previewCode}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Siguiente Oficial
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulario Normativo de Encabezado */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    2. Bloque de Datos Institucionales (A:, DE:, REF:, FECHA):
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* A: Destinatario */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      A: (Nombre del Destinatario)
                    </label>
                    <SmartCorrespondenceInput
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Ej. Lic. Roberto Meneses"
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Cargo Destinatario */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cargo del Destinatario:
                    </label>
                    <SmartCorrespondenceInput
                      value={recipientRole}
                      onChange={(e) => setRecipientRole(e.target.value)}
                      placeholder="Ej. Gerente General / Todo el Personal"
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Entidad si es Carta Externa */}
                  {selectedDocType === 'NE' && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Entidad / Institución Externa Destino:</span>
                      </label>
                      <SmartCorrespondenceInput
                        value={recipientEntity}
                        onChange={(e) => setRecipientEntity(e.target.value)}
                        placeholder="Ej. Banco Bisa S.A. / Gobierno Autónomo Municipal de La Paz"
                        className="w-full bg-slate-50 dark:bg-[#06110D] border border-sky-300 dark:border-sky-800/50 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  )}

                  {/* DE: Remitente */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      DE: (Nombre de Quien Elabora o Firma)
                    </label>
                    <SmartCorrespondenceInput
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Ej. Ing. Carlos Mendoza"
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Cargo Remitente */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cargo del Remitente:
                    </label>
                    <SmartCorrespondenceInput
                      value={senderRole}
                      onChange={(e) => setSenderRole(e.target.value)}
                      placeholder="Ej. Encargado de Sistemas & TI"
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Iniciales de Responsabilidad */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Iniciales de Responsabilidad:</span>
                      <span className="text-[10px] text-slate-400 font-normal">MAYÚSCULAS/minúsculas</span>
                    </label>
                    <SmartCorrespondenceInput
                      value={initials}
                      onChange={(e) => setInitials(e.target.value)}
                      placeholder="Ej. TNT/mda"
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Fecha Oficial */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Fecha Oficial del Documento:</span>
                    </label>
                    <input
                      type="date"
                      value={officialDate}
                      onChange={(e) => setOfficialDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* REF: Referencia / Para qué */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>REF.: (Referencia / Objeto / Para qué se utiliza)</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">Se imprimirá en negrita</span>
                  </label>
                  <SmartCorrespondenceInput
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej. SOLICITUD DE ADQUISICIÓN DE REPUESTOS PARA SISTEMA DE BOMBEO"
                    className="w-full bg-slate-50 dark:bg-[#06110D] border-2 border-slate-300 dark:border-emerald-800/50 rounded-xl p-3 text-xs font-bold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Redacción según el modelo */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    3. Redacción del Contenido (Plantilla Oficial editable):
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedDocType === 'INF' ? 'Estructura normada de 3 puntos' : 'Texto libre justificado'}
                  </span>
                </div>

                {selectedDocType === 'INF' ? (
                  <div className="space-y-3 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-emerald-900/30">
                    {/* 1. Antecedentes */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        1. ANTECEDENTES
                      </label>
                      <SmartCorrespondenceTextarea
                        rows={2}
                        value={antecedentes}
                        onChange={(e) => setAntecedentes(e.target.value)}
                        placeholder="Descripción sucinta del origen o contexto del requerimiento..."
                        className="w-full bg-white dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    {/* 2. Análisis Técnico */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        2. ANÁLISIS TÉCNICO / DESARROLLO
                      </label>
                      <SmartCorrespondenceTextarea
                        rows={3}
                        value={analisisTecnico}
                        onChange={(e) => setAnalisisTecnico(e.target.value)}
                        placeholder="Desarrollo técnico, peritajes, cotizaciones o evaluaciones..."
                        className="w-full bg-white dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    {/* 3. Conclusiones */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        3. CONCLUSIONES Y RECOMENDACIONES
                      </label>
                      <SmartCorrespondenceTextarea
                        rows={2}
                        value={conclusiones}
                        onChange={(e) => setConclusiones(e.target.value)}
                        placeholder="Conclusiones finales y recomendación a la autoridad..."
                        className="w-full bg-white dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/40 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <SmartCorrespondenceTextarea
                      rows={5}
                      value={bodyTextGeneral}
                      onChange={(e) => setBodyTextGeneral(e.target.value)}
                      placeholder="Redacte el cuerpo de la nota o instructivo conforme a la normativa institucional..."
                      className="w-full bg-slate-50 dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-2xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!createdCite && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-emerald-900/40 flex items-center justify-between bg-slate-50 dark:bg-[#091A14] flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-emerald-300/70">
              <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>El CITE quedará registrado en el Libro de Control con su usuario y fecha inmutable.</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleGenerate(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-emerald-950/60 hover:bg-slate-300 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-emerald-200 border border-slate-300 dark:border-emerald-700/40 font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>Solo Reservar CITE</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleGenerate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>{isSubmitting ? 'Emitiendo...' : 'Emitir y Descargar PDF Oficial'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GenerateCiteModal;
