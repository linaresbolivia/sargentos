import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import {
  X,
  Hash,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  FileSignature,
  Lock,
  AlertCircle,
  FileText,
  Send,
  Scroll,
  Briefcase,
  Globe,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { citeService, resolveDepartmentToCiteAreaKey } from '../services/citeService';
import { OfficialArea } from '../types/cite.types';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';

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

interface DocTypeConfig {
  key: string;
  modelNumber: number;
  modelBadge: string;
  name: string;
  shortName: string;
  description: string;
  structure: string;
  lockBadge?: string;
  lockMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderActive: string;
  bgActive: string;
  ringActive: string;
  glowActive: string;
  badgeClass: string;
  previewPrefix: string;
}

const OFFICIAL_DOC_TYPES: DocTypeConfig[] = [
  {
    key: 'INF',
    modelNumber: 1,
    modelBadge: 'MODELO 1 • INF',
    name: 'INFORME TÉCNICO / PERICIAL',
    shortName: 'Informe Técnico',
    description: 'Estructura obligatoria de 3 secciones normativas para dictámenes y peritajes técnicos.',
    structure: '1. Antecedentes • 2. Análisis Técnico / Desarrollo • 3. Conclusiones y Recomendaciones • Cierre: «Es cuanto tengo a bien informar...»',
    lockMessage: 'Habilitado para todos los cargos y áreas técnicas.',
    icon: FileText,
    accentColor: 'text-emerald-500 dark:text-emerald-400',
    borderActive: 'border-emerald-500',
    bgActive: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    ringActive: 'ring-2 ring-emerald-500/40',
    glowActive: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    previewPrefix: 'INF',
  },
  {
    key: 'CI',
    modelNumber: 2,
    modelBadge: 'MODELO 2 • CI',
    name: 'COMUNICACIÓN INTERNA (NOTA)',
    shortName: 'Comunicación Interna',
    description: 'Intercambio administrativo formal entre áreas y despachos internos del Club.',
    structure: 'Bloque normativo A:, DE:, REF.:, FECHA:, cuerpo fluido con fórmula de cortesía, firma de emisor e iniciales de responsabilidad, c.c. Archivo.',
    lockMessage: 'Habilitado para todos los cargos y despachos oficiales.',
    icon: Send,
    accentColor: 'text-teal-500 dark:text-teal-400',
    borderActive: 'border-teal-500',
    bgActive: 'bg-teal-500/10 dark:bg-teal-500/15',
    ringActive: 'ring-2 ring-teal-500/40',
    glowActive: 'shadow-[0_0_20px_rgba(20,184,166,0.25)]',
    badgeClass: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40',
    previewPrefix: 'CI',
  },
  {
    key: 'INST',
    modelNumber: 3,
    modelBadge: 'MODELO 3 • INST',
    name: 'INSTRUCTIVO INSTITUCIONAL',
    shortName: 'Instructivo',
    description: 'Directrices de cumplimiento obligatorio emanadas por Gerencia General o Jefaturas.',
    structure: 'Encabezado destacado INSTRUCTIVO, artículos / puntos numerados de aplicación obligatoria, alcance estricto para dependientes y fecha de vigencia.',
    lockBadge: 'Gerencia',
    lockMessage: 'Según Instructivo JOFHR 022-2026, los Instructivos están reservados para Gerencia General y Jefaturas autorizadas.',
    icon: Scroll,
    accentColor: 'text-amber-500 dark:text-amber-400',
    borderActive: 'border-amber-500',
    bgActive: 'bg-amber-500/10 dark:bg-amber-500/15',
    ringActive: 'ring-2 ring-amber-500/40',
    glowActive: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
    previewPrefix: 'INST',
  },
  {
    key: 'MEM',
    modelNumber: 4,
    modelBadge: 'MODELO 4 • MEM',
    name: 'MEMORÁNDUM DE FUNCIONES',
    shortName: 'Memorándum',
    description: 'Comunicaciones directas al personal: designaciones, felicitaciones o conminatorias.',
    structure: 'Designación de comisiones y funciones, felicitaciones institucionales, llamadas de atención y conminatorias, con c.c. File Personal / Archivo.',
    lockBadge: 'JOFHR / RRHH',
    lockMessage: 'Según Instructivo JOFHR 022-2026, los Memorándums están reservados para Gerencia General, JOFHR y Recursos Humanos.',
    icon: Briefcase,
    accentColor: 'text-indigo-500 dark:text-indigo-400',
    borderActive: 'border-indigo-500',
    bgActive: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    ringActive: 'ring-2 ring-indigo-500/40',
    glowActive: 'shadow-[0_0_20px_rgba(99,102,241,0.25)]',
    badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
    previewPrefix: 'MEM',
  },
  {
    key: 'NE',
    modelNumber: 5,
    modelBadge: 'MODELO 5 • NE / CARTA',
    name: 'CARTA EXTERNA / NOTA EXTERNA',
    shortName: 'Carta Externa',
    description: 'Correspondencia externa dirigida a instituciones, proveedores y empresas (S/N).',
    structure: 'Sin CITE institucional correlativo interno (Documento Externo S/N o ref. propia). Vocativo formal: Señor(a) [Nombre], [Cargo], [Empresa], Presente.- Saludo y despedida protocolar.',
    lockBadge: 'Gerencia Gral.',
    lockMessage: 'Según Instructivo JOFHR 022-2026, las Cartas Externas son exclusivas para Gerencia General.',
    icon: Globe,
    accentColor: 'text-sky-500 dark:text-sky-400',
    borderActive: 'border-sky-500',
    bgActive: 'bg-sky-500/10 dark:bg-sky-500/15',
    ringActive: 'ring-2 ring-sky-500/40',
    glowActive: 'shadow-[0_0_20px_rgba(14,165,233,0.25)]',
    badgeClass: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40',
    previewPrefix: 'NE',
  },
];

export const GenerateCiteModal: React.FC<GenerateCiteModalProps> = ({
  isOpen,
  onClose,
  onCiteCreated,
  initialDocType,
  initialAreaKey,
  initialSubject = '',
  currentPerspective,
  canAccessAllAreas,
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [areas, setAreas] = useState<OfficialArea[]>([]);
  const [metaAllowedDocTypes, setMetaAllowedDocTypes] = useState<string[]>([]);

  // Resolver el área oficial del usuario autenticado
  const initialResolvedArea = initialAreaKey || resolveDepartmentToCiteAreaKey(
    (currentUser as any)?.area ||
    (currentUser as any)?.department ||
    (currentUser as any)?.role ||
    currentPerspective
  ) || 'GG';

  const [selectedAreaKey, setSelectedAreaKey] = useState<string>(initialResolvedArea);
  const [selectedDocType, setSelectedDocType] = useState<string>(initialDocType || 'CI');
  const [previewCode, setPreviewCode] = useState<string>(`CHLS-${initialResolvedArea}-${initialDocType || 'CI'}-N° 001/2026`);

  // Asunto obligatorio
  const [subject, setSubject] = useState(initialSubject || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCite, setCreatedCite] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Nombre y cargo calculados automáticamente según el usuario autenticado
  const userFullName = useMemo(() => {
    if (!currentUser) return 'Funcionario CHLS';
    const clean = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    return clean || (currentUser as any).username || currentUser.email?.split('@')[0] || 'Funcionario CHLS';
  }, [currentUser]);

  const currentAreaName = useMemo(() => {
    const found = areas.find((a) => a.key === selectedAreaKey);
    return found ? found.name : (currentPerspective || selectedAreaKey);
  }, [areas, selectedAreaKey, currentPerspective]);

  const userRole = useMemo(() => {
    return (currentUser as any)?.area || (currentUser as any)?.department || (currentUser as any)?.role || `Responsable de ${currentAreaName}`;
  }, [currentUser, currentAreaName]);

  const userInitials = useMemo(() => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}/${selectedAreaKey.toLowerCase()}`.toUpperCase();
    }
    return `${selectedAreaKey}/adm`.toUpperCase();
  }, [currentUser, selectedAreaKey]);

  // Determinar qué tipos de documentos están permitidos PARA CADA USUARIO SEGÚN SU CARGO
  const effectiveAllowedDocTypes = useMemo(() => {
    // 1. Privilegios globales de Gerencia General / SuperAdmin / Vista 360°
    if (canAccessAllAreas) {
      return ['INF', 'CI', 'INST', 'MEM', 'NE'];
    }

    const userRoles = (currentUser?.roles || []).map((r: any) =>
      (typeof r === 'string' ? r : r.name || '').toUpperCase()
    );

    const isGerencia =
      userRoles.includes('GERENTE_GENERAL') ||
      userRoles.includes('ADMIN') ||
      userRoles.includes('SUPER_ADMIN') ||
      userRoles.includes('SECRETARIA') ||
      selectedAreaKey === 'GG' ||
      (currentPerspective && currentPerspective.toUpperCase().includes('GERENCIA'));

    if (isGerencia) {
      return ['INF', 'CI', 'INST', 'MEM', 'NE'];
    }

    const normalizedRole = ((currentUser as any)?.area || (currentUser as any)?.department || (currentUser as any)?.role || '').toUpperCase();
    const isJofhr =
      normalizedRole.includes('JEFATURA') ||
      normalizedRole.includes('JEFE') ||
      normalizedRole.includes('SUBGERENCIA') ||
      normalizedRole.includes('JOFRH') ||
      normalizedRole.includes('JOFHR') ||
      selectedAreaKey === 'JOFRH';

    const isRrhh =
      normalizedRole.includes('RRHH') ||
      normalizedRole.includes('RECURSOS HUMANOS') ||
      normalizedRole.includes('PERSONAL') ||
      selectedAreaKey === 'JOFRH-RRHH';

    if (isJofhr) {
      return ['INF', 'CI', 'INST', 'MEM'];
    }

    if (isRrhh) {
      return ['INF', 'CI', 'MEM'];
    }

    if (metaAllowedDocTypes && metaAllowedDocTypes.length > 0) {
      return metaAllowedDocTypes;
    }

    // Por defecto según Instructivo JOFHR 022-2026: Todos los cargos pueden redactar Informe y Comunicación Interna
    return ['INF', 'CI'];
  }, [canAccessAllAreas, metaAllowedDocTypes, selectedAreaKey, currentPerspective, currentUser]);

  // Inicializar estado cuando abre el modal
  useEffect(() => {
    if (!isOpen) return;
    setCreatedCite(null);
    setSubject(initialSubject || '');
    if (initialDocType) {
      setSelectedDocType(initialDocType);
    }
  }, [isOpen, initialSubject, initialDocType]);

  // Si el tipo seleccionado actualmente no está permitido para el cargo, cambiar al primer tipo permitido
  useEffect(() => {
    if (effectiveAllowedDocTypes.length > 0 && !effectiveAllowedDocTypes.includes(selectedDocType)) {
      setSelectedDocType(effectiveAllowedDocTypes[0]);
    }
  }, [effectiveAllowedDocTypes, selectedDocType]);

  // Cargar Metadata del backend (áreas oficiales y tipos permitidos por usuario)
  useEffect(() => {
    if (!isOpen) return;
    citeService
      .getMetadata()
      .then((data) => {
        setAreas(data.areas || []);
        if (data.allowedDocTypesForUser) {
          setMetaAllowedDocTypes(data.allowedDocTypesForUser);
        }
        // Asignación estricta del área oficial según usuario logueado si no se especificó
        if (!initialAreaKey) {
          const userAssignedArea =
            data.userAreaKey ||
            resolveDepartmentToCiteAreaKey(
              (currentUser as any)?.area ||
              (currentUser as any)?.department ||
              (currentUser as any)?.role ||
              currentPerspective
            ) ||
            'GG';
          setSelectedAreaKey(userAssignedArea);
        }
      })
      .catch((err) => {
        console.error('Error cargando metadata de CITEs:', err);
      });
  }, [isOpen, currentUser, currentPerspective, initialAreaKey]);

  // Actualizar Vista Previa del CITE dinámicamente según área y tipo seleccionado
  useEffect(() => {
    if (!selectedAreaKey || !selectedDocType) return;
    const currentYear = new Date().getFullYear();

    if (selectedDocType === 'NE') {
      setPreviewCode('S/N (Carta Externa)');
      return;
    }

    citeService
      .getPreview(selectedAreaKey, selectedDocType, currentYear)
      .then((res) => {
        if (res?.formattedCode) {
          setPreviewCode(res.formattedCode);
        }
      })
      .catch((err) => {
        console.warn('Error fetching preview:', err);
        setPreviewCode(`CHLS-${selectedAreaKey}-${selectedDocType}-N° 001/${currentYear}`);
      });
  }, [selectedAreaKey, selectedDocType]);

  // Filtrar exclusivamente los tipos que corresponden al usuario según su cargo
  const availableDocTypes = useMemo(() => {
    const filtered = OFFICIAL_DOC_TYPES.filter((doc) => effectiveAllowedDocTypes.includes(doc.key));
    return filtered.length > 0 ? filtered : [OFFICIAL_DOC_TYPES[1]]; // Por defecto Modelo 2 (CI) si no hubiera otro
  }, [effectiveAllowedDocTypes]);

  // Si el tipo seleccionado no está entre los disponibles para el usuario, asignar el primero disponible
  useEffect(() => {
    if (availableDocTypes.length > 0 && !availableDocTypes.some((d) => d.key === selectedDocType)) {
      setSelectedDocType(availableDocTypes[0].key);
    }
  }, [availableDocTypes, selectedDocType]);

  // Layout dinámico para adaptar el tamaño y columnas según la cantidad de modelos autorizados
  const gridLayoutClass = useMemo(() => {
    const count = availableDocTypes.length;
    if (count === 1) return 'grid-cols-1 max-w-sm mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5';
  }, [availableDocTypes.length]);

  if (!isOpen) return null;

  const currentDocConfig = availableDocTypes.find((d) => d.key === selectedDocType) || availableDocTypes[0] || OFFICIAL_DOC_TYPES[1];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`CITE copiado: ${code}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSelectDocType = (docKey: string) => {
    setSelectedDocType(docKey);
  };

  const handleGenerate = async () => {
    if (!effectiveAllowedDocTypes.includes(selectedDocType)) {
      toast.error(`El tipo de documento ${currentDocConfig.name} no está habilitado para su cargo.`);
      return;
    }

    if (!subject.trim()) {
      toast.error('Por favor indique la Referencia o Asunto del CITE');
      return;
    }

    setIsSubmitting(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const payload = {
        areaKey: selectedAreaKey,
        docType: selectedDocType,
        year: new Date().getFullYear(),
        recipient: 'Lic. Roberto Meneses',
        recipientRole: 'Gerente General CHLS',
        senderName: userFullName,
        senderRole: userRole,
        initials: userInitials,
        subject: subject.trim(),
        status: 'EMITIDO' as const,
        officialDate: todayDate,
      };

      const result = await citeService.createCite(payload);
      setCreatedCite(result);
      toast.success(`CITE Oficial ${result.citeCode} generado con éxito`);

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/60 rounded-3xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-emerald-900/40 flex justify-between items-center bg-slate-50/90 dark:bg-[#091A14]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Generar CITE Oficial
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  CHLS 360°
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-emerald-400/70 mt-0.5">
                Emisión y registro de correlativo oficial para correspondencia
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

        {/* Contenido del Modal */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Pantalla de Éxito al Generar CITE */}
          {createdCite ? (
            <div className="p-6 text-center space-y-5 bg-emerald-500/10 border border-emerald-500/40 rounded-3xl animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                  ✓ CITE Oficial Generado y Registrado
                </span>
                
                {/* Código CITE Grande */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-2xl sm:text-3xl font-mono font-black px-5 py-2.5 rounded-2xl bg-white dark:bg-black/60 text-slate-900 dark:text-emerald-200 border-2 border-emerald-500/50 shadow-inner">
                    {createdCite.citeCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(createdCite.citeCode)}
                    title="Copiar código al portapapeles"
                    className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-emerald-400/90 mt-2.5 font-medium max-w-md mx-auto">
                  El correlativo fue registrado en el Libro Oficial de CITEs y ya está disponible para su uso en notas y correspondencia.
                </p>
              </div>

              {/* Detalle del CITE emitido */}
              <div className="max-w-md mx-auto text-xs text-slate-700 dark:text-slate-200 space-y-1.5 text-left bg-white dark:bg-[#06110D] p-4 rounded-2xl border border-emerald-500/20 shadow-xs">
                <p><strong>Tipo de Documento:</strong> {currentDocConfig.name} ({currentDocConfig.modelBadge})</p>
                <p><strong>Área Emisora:</strong> {createdCite.areaName} ({createdCite.areaKey})</p>
                <p><strong>Referencia:</strong> {createdCite.subject}</p>
                <p><strong>Generado por:</strong> {createdCite.senderName} ({createdCite.senderRole})</p>
                <p><strong>Fecha Oficial:</strong> {new Date(createdCite.officialDate).toLocaleDateString('es-BO')}</p>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setCreatedCite(null);
                    setSubject('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
                >
                  Generar Otro CITE
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Bloque Superior: Área Oficial Asignada + Previsualización del CITE Siguiente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-emerald-900/30">
                {/* Área Oficial del Usuario Logueado */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Área Emisora:</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>Usuario Logueado</span>
                    </span>
                  </label>

                  <div className="flex items-center justify-between bg-white dark:bg-[#050D09] border border-slate-300 dark:border-emerald-800/40 rounded-xl px-3.5 py-2 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                        [{selectedAreaKey}]
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {currentAreaName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Previsualizador de CITE Siguiente (Actualizado según el Tipo Seleccionado) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-emerald-500" />
                      <span>CITE a Generar:</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {selectedDocType === 'NE' ? 'Documento Externo' : 'Correlativo Oficial'}
                    </span>
                  </label>

                  <div className={`flex items-center justify-between bg-white dark:bg-[#050D09] border-2 rounded-xl px-3.5 py-2 shadow-inner transition-colors ${currentDocConfig.borderActive}`}>
                    <span className={`font-mono text-sm font-black tracking-wide truncate ${currentDocConfig.accentColor}`}>
                      {previewCode}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ml-2 border ${currentDocConfig.badgeClass}`}>
                      {selectedDocType === 'NE' ? 'Externo' : 'Siguiente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: Selector de Tipos de CITE habilitados según el cargo del usuario */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tipo de CITE / Modelo Oficial:</span>
                  </label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    {availableDocTypes.length} {availableDocTypes.length === 1 ? 'modelo autorizado' : 'modelos autorizados'} para su cargo
                  </span>
                </div>

                {/* Grid adaptativo con únicamente los modelos autorizados para el usuario */}
                <div className={`grid ${gridLayoutClass} gap-2.5`}>
                  {availableDocTypes.map((doc) => {
                    const isSelected = selectedDocType === doc.key;
                    const Icon = doc.icon;

                    return (
                      <button
                        key={doc.key}
                        type="button"
                        onClick={() => handleSelectDocType(doc.key)}
                        title={`Seleccionar ${doc.name}`}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[105px] group cursor-pointer ${
                          isSelected
                            ? `${doc.borderActive} ${doc.bgActive} ${doc.ringActive} ${doc.glowActive}`
                            : 'border-slate-200 dark:border-emerald-800/40 bg-white dark:bg-[#050D09] hover:border-emerald-500/60 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Cabecera de la Tarjeta */}
                        <div className="flex items-center justify-between gap-1 w-full mb-1.5">
                          <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border uppercase shrink-0 ${doc.badgeClass}`}>
                            {doc.modelBadge.split('•')[0].trim()} • {doc.key}
                          </span>

                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-500 shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <Icon className={`w-4 h-4 text-slate-400 group-hover:${doc.accentColor} transition-colors shrink-0`} />
                          )}
                        </div>

                        {/* Nombre del Documento */}
                        <div className="my-auto py-1">
                          <h4 className={`text-xs font-bold leading-snug ${
                            isSelected
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {doc.name}
                          </h4>
                        </div>

                        {/* Pie de la tarjeta */}
                        <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[10px]">
                          {isSelected ? (
                            <span className={`font-bold flex items-center gap-1.5 ${doc.accentColor}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              Seleccionado
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-medium">
                              Clic para seleccionar
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Banner Informativo del Modelo Seleccionado */}
                <div className={`p-3 rounded-2xl border transition-all ${currentDocConfig.borderActive} ${currentDocConfig.bgActive}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg bg-white dark:bg-black/40 border border-emerald-500/20 shrink-0 mt-0.5 ${currentDocConfig.accentColor}`}>
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="text-xs space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {currentDocConfig.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${currentDocConfig.badgeClass}`}>
                          {currentDocConfig.modelBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 leading-relaxed">
                        {currentDocConfig.structure}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo Requerido: Referencia / Asunto */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Referencia / Asunto (¿Para qué trámite es el CITE?):</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Obligatorio</span>
                </label>
                <SmartCorrespondenceInput
                  autoFocus
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={`Ej. SOLICITUD DE ${selectedDocType === 'INF' ? 'INSPECCIÓN TÉCNICA' : selectedDocType === 'MEM' ? 'DESIGNACIÓN DE FUNCIONES' : selectedDocType === 'INST' ? 'APLICACIÓN DE NORMATIVA' : 'ADQUISICIÓN DE SUMINISTROS'}`}
                  className="w-full bg-slate-50 dark:bg-[#06110D] border-2 border-slate-300 dark:border-emerald-800/50 rounded-xl p-3.5 text-xs font-bold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>

              {/* Resumen del registro según el cargo oficial del usuario logueado */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Asignado a:</span>
                  <span className="font-medium truncate">{userFullName}</span>
                  <span className="text-slate-400 dark:text-slate-500 truncate">({userRole})</span>
                </div>
                <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  {new Date().toLocaleDateString('es-BO')}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Pie del Modal con Acción de Generación */}
        {!createdCite && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-emerald-900/40 flex items-center justify-between bg-slate-50 dark:bg-[#091A14] flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-emerald-400/80">
              <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Registro oficial inmutable en el Libro de CITEs.</span>
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
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Hash className="w-4 h-4 text-white stroke-[2.5]" />
                <span>
                  {isSubmitting
                    ? 'Generando CITE...'
                    : `Generar CITE (${currentDocConfig.previewPrefix})`}
                </span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GenerateCiteModal;
