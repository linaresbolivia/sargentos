import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Plus,
  Download,
  Copy,
  Check,
  Building2,
  Calendar,
  Filter,
  FileText,
  Send,
  Scroll,
  Briefcase,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Ban,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { citeService, resolveDepartmentToCiteAreaKey } from '../services/citeService';
import { OfficialCiteItem, OfficialArea, OfficialDocType } from '../types/cite.types';
import GenerateCiteModal from './GenerateCiteModal';

interface OfficialCitesLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRouteSheet?: (hrCodeOrId: string) => void;
  currentPerspective?: string;
  canAccessAllAreas?: boolean;
}

export const OfficialCitesLedgerModal: React.FC<OfficialCitesLedgerModalProps> = ({
  isOpen,
  onClose,
  onOpenRouteSheet,
  currentPerspective,
  canAccessAllAreas,
}) => {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'MODELS'>('LEDGER');
  const [cites, setCites] = useState<OfficialCiteItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [stats, setStats] = useState<any | null>(null);
  const [areas, setAreas] = useState<OfficialArea[]>([]);
  const [docTypes, setDocTypes] = useState<OfficialDocType[]>([]);
  const [metaInfo, setMetaInfo] = useState<{
    userAreaKey?: string;
    userAreaName?: string;
    canAccessAllAreas?: boolean;
    allowedDocTypesForUser?: string[];
  }>({});

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [modelToGenerate, setModelToGenerate] = useState<string>('CI');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Cancellation Modal state
  const [cancelModalItem, setCancelModalItem] = useState<OfficialCiteItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');

  // Determine effective access rights
  const effectiveCanAccessAll = useMemo(() => {
    if (canAccessAllAreas !== undefined) return canAccessAllAreas;
    if (metaInfo.canAccessAllAreas !== undefined) return metaInfo.canAccessAllAreas;
    return true;
  }, [canAccessAllAreas, metaInfo.canAccessAllAreas]);

  const assignedAreaKey = useMemo(() => {
    return metaInfo.userAreaKey || (currentPerspective ? resolveDepartmentToCiteAreaKey(currentPerspective) : '');
  }, [metaInfo.userAreaKey, currentPerspective]);

  const assignedAreaName = useMemo(() => {
    if (metaInfo.userAreaName) return metaInfo.userAreaName;
    if (assignedAreaKey) {
      const match = areas.find(a => a.key === assignedAreaKey);
      if (match) return match.name;
    }
    return assignedAreaKey || 'Mi Área';
  }, [metaInfo.userAreaName, assignedAreaKey, areas]);

  const allowedDocTypes = useMemo(() => {
    if (effectiveCanAccessAll) return ['INF', 'CI', 'INST', 'MEM', 'NE'];
    return metaInfo.allowedDocTypesForUser || ['INF', 'CI'];
  }, [effectiveCanAccessAll, metaInfo.allowedDocTypesForUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const meta = await citeService.getMetadata();
      setAreas(meta.areas || []);
      setDocTypes(meta.docTypes || []);
      setMetaInfo({
        userAreaKey: meta.userAreaKey,
        userAreaName: meta.userAreaName,
        canAccessAllAreas: meta.canAccessAllAreas,
        allowedDocTypesForUser: meta.allowedDocTypesForUser,
      });

      const canAccessAll = canAccessAllAreas !== undefined ? canAccessAllAreas : (meta.canAccessAllAreas ?? true);
      const userKey = meta.userAreaKey || (currentPerspective ? resolveDepartmentToCiteAreaKey(currentPerspective) : undefined);

      const targetAreaKey = !canAccessAll && userKey
        ? userKey
        : (selectedArea !== 'ALL' ? selectedArea : undefined);

      const [st, listRes] = await Promise.all([
        citeService.getStats(selectedYear, targetAreaKey),
        citeService.listCites({
          year: selectedYear,
          areaKey: targetAreaKey,
          docType: selectedType !== 'ALL' ? selectedType : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: searchQuery.trim() || undefined,
          limit: 200,
        }),
      ]);

      setStats(st);
      setCites(listRes.data || []);
      setTotal(listRes.total || 0);
    } catch (err: any) {
      console.error('Error cargando libro de CITEs:', err);
      toast.error('Error al cargar el Libro de CITEs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedYear, selectedArea, selectedType, selectedStatus, searchQuery, effectiveCanAccessAll, assignedAreaKey]);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`CITE copiado: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownloadPdf = async (item: OfficialCiteItem) => {
    try {
      await citeService.downloadCitePdf(item.id, `${item.citeCode.replace(/[\/\s°N]/g, '_')}.pdf`);
      toast.success(`Descargando documento de ${item.citeCode}`);
    } catch (err) {
      toast.error('Error al descargar el documento PDF');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalItem) return;
    if (!cancellationReason.trim()) {
      toast.error('Debe indicar el motivo de la anulación para fines de auditoría');
      return;
    }

    try {
      await citeService.updateStatus(cancelModalItem.id, 'ANULADO', cancellationReason.trim());
      toast.success(`CITE ${cancelModalItem.citeCode} anulado formalmente`);
      setCancelModalItem(null);
      setCancellationReason('');
      loadData();
    } catch (err) {
      toast.error('Error al anular CITE');
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'INF':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'CI':
        return 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30';
      case 'INST':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'MEM':
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
      case 'NE':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RADICADO_HR':
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
      case 'EMITIDO':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'RESERVADO':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'ANULADO':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 line-through';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07130E] border-2 border-emerald-500/50 rounded-3xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden shadow-[0_0_90px_rgba(16,185,129,0.35)] my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-emerald-500/30 flex justify-between items-center bg-slate-50/90 dark:bg-[#091A14] flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <BookOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Libro Oficial de Control de CITEs & Modelos Institucionales
                </h2>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Instructivo JOFHR 022-2026
                </span>
                {!effectiveCanAccessAll && assignedAreaKey && (
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    Área: [{assignedAreaKey}] {assignedAreaName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-emerald-300/70 mt-0.5">
                {!effectiveCanAccessAll
                  ? `Control y auditoría exclusiva de correlativos para ${assignedAreaName} (${assignedAreaKey}): quién lo utilizó, destino, motivo y fecha.`
                  : 'Auditoría completa de correlativos por área: quién lo utilizó, dónde / a quién, para qué y en qué fecha'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Pestañas Libro vs Modelos */}
            <div className="flex items-center bg-slate-200/80 dark:bg-black/50 p-1 rounded-xl border border-slate-300 dark:border-emerald-800/40 text-xs font-bold">
              <button
                onClick={() => setActiveTab('LEDGER')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'LEDGER'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Libro de CITEs ({total})
              </button>
              <button
                onClick={() => setActiveTab('MODELS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'MODELS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Los 5 Modelos Oficiales
              </button>
            </div>

            {/* Botón Principal Generar */}
            <button
              onClick={() => {
                setModelToGenerate('CI');
                setIsGenerateModalOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-400/30 text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Generar CITE</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Libro de Auditoría de CITEs */}
        {activeTab === 'LEDGER' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-emerald-400/70 block">
                  {!effectiveCanAccessAll && assignedAreaKey
                    ? `Total ${assignedAreaKey} (${selectedYear})`
                    : `Total CITEs ${selectedYear}`}
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.total ?? total}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                  📄 Informes (INF)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.byDocType?.INF ?? 0}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 block">
                  ✉️ Com. Internas (CI)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.byDocType?.CI ?? 0}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                  📜 Instructivos (INST)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.byDocType?.INST ?? 0}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
                  📋 Memorándums (MEM)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.byDocType?.MEM ?? 0}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">
                  🌐 Cartas Ext. (NE)
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.byDocType?.NE ?? 0}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 dark:bg-black/30 p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-800/30">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-400/60" />
                <input
                  type="text"
                  placeholder="Buscar por CITE, asunto (para qué), quién lo utilizó o a quién fue dirigido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Año */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value={2026}>Gestión 2026</option>
                  <option value={2025}>Gestión 2025</option>
                </select>

                {/* Área */}
                {!effectiveCanAccessAll ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[200px]">[{assignedAreaKey}] {assignedAreaName}</span>
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ml-1">
                      Mi Área
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="bg-white dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer max-w-[180px]"
                  >
                    <option value="ALL">Todas las Áreas</option>
                    {areas.map((a) => (
                      <option key={a.key} value={a.key}>
                        [{a.key}] {a.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Tipo */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-white dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="ALL">Todos los Modelos</option>
                  <option value="INF">Informes (INF)</option>
                  <option value="CI">Comunicaciones Internas (CI)</option>
                  <option value="INST">Instructivos (INST)</option>
                  <option value="MEM">Memorándums (MEM)</option>
                  <option value="NE">Cartas Externas (NE)</option>
                </select>

                {/* Estado */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="EMITIDO">Emitido</option>
                  <option value="RADICADO_HR">Radicado en HR</option>
                  <option value="RESERVADO">Reservado</option>
                  <option value="ANULADO">Anulado</option>
                </select>
              </div>
            </div>

            {/* Table of CITEs */}
            <div className="bg-white dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/30 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-[#091A14] text-slate-600 dark:text-emerald-400/80 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-emerald-800/30">
                    <tr>
                      <th className="px-4 py-3">CITE Oficial</th>
                      <th className="px-4 py-3">Área & Modelo</th>
                      <th className="px-4 py-3">Dónde / A Quién</th>
                      <th className="px-4 py-3">Para Qué (Referencia)</th>
                      <th className="px-4 py-3">Quién lo Utilizó</th>
                      <th className="px-4 py-3">Fecha Oficial & Hora</th>
                      <th className="px-4 py-3 text-center">Estado / HR</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/40">
                    {cites.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400 dark:text-emerald-400/50">
                          No se encontraron CITEs registrados con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      cites.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50 dark:hover:bg-emerald-950/20 transition-colors"
                        >
                          {/* CITE Code */}
                          <td className="px-4 py-3 font-mono font-black text-slate-950 dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-xs">
                                {c.citeCode}
                              </span>
                              <button
                                onClick={() => handleCopy(c.citeCode)}
                                title="Copiar CITE"
                                className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                              >
                                {copiedCode === c.citeCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          {/* Área & Modelo */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {c.areaName}
                            </div>
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.2 rounded-full border mt-0.5 ${getDocTypeBadge(c.docType)}`}>
                              {c.docType}
                            </span>
                          </td>

                          {/* Destino (A quién / Dónde) */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {c.recipient}
                            </div>
                            {c.recipientRole && (
                              <div className="text-[10px] text-slate-500 dark:text-emerald-300/60">
                                {c.recipientRole}
                              </div>
                            )}
                            {c.recipientEntity && (
                              <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                🏢 {c.recipientEntity}
                              </div>
                            )}
                          </td>

                          {/* Referencia (Para qué) */}
                          <td className="px-4 py-3 max-w-[280px]">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2" title={c.subject}>
                              {c.subject}
                            </p>
                          </td>

                          {/* Quién lo utilizó */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {c.senderName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-emerald-300/60">
                              {c.senderRole}
                            </div>
                            {c.initials && (
                              <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                                Iniciales: {c.initials}
                              </div>
                            )}
                          </td>

                          {/* Fecha */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(c.officialDate).toLocaleDateString('es-BO')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Reg: {new Date(c.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Estado & HR */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(c.status)}`}>
                              {c.status}
                            </span>
                            {c.routeSheet && (
                              <button
                                onClick={() => onOpenRouteSheet && onOpenRouteSheet(c.routeSheet!.hrCode)}
                                className="mt-1 flex items-center gap-1 mx-auto text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                <span>HR {c.routeSheet.hrCode}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {c.status === 'ANULADO' && c.cancellationReason && (
                              <div className="text-[9px] text-rose-500 line-clamp-1 max-w-[120px] mx-auto mt-0.5" title={c.cancellationReason}>
                                Motivo: {c.cancellationReason}
                              </div>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Descargar PDF */}
                              <button
                                onClick={() => handleDownloadPdf(c)}
                                title="Descargar documento oficial PDF"
                                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Anular CITE si no está anulado */}
                              {c.status !== 'ANULADO' && (
                                <button
                                  onClick={() => setCancelModalItem(c)}
                                  title="Anular CITE (registra motivo para auditoría)"
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Guía de los 5 Modelos Oficiales y Normativa */}
        {activeTab === 'MODELS' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-emerald-200">
                <strong className="text-slate-950 dark:text-white font-bold block mb-0.5">
                  Catálogo Normativo de Documentos Oficiales — Instructivo JOFHR 022-2026
                </strong>
                Aprobado por el Club Hípico Los Sargentos con vigencia obligatoria a partir del 1 de junio de 2026.
                Todos los documentos cuentan con foliación continua, tipografía Arial 11, márgenes oficiales (4.5 cm superior, 3.0 cm laterales), pie de página reglamentario y código QR de autenticidad inmutable.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Modelo 1: Informe */}
              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      MODELO 1 • INF
                    </span>
                    <FileText className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    INFORME TÉCNICO / PERICIAL
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-300 mt-1">
                    Estructura obligatoria de 3 secciones:
                  </p>
                  <ul className="text-[11px] text-slate-600 dark:text-emerald-300/80 list-disc list-inside space-y-0.5 mt-2">
                    <li>1. ANTECEDENTES</li>
                    <li>2. ANÁLISIS TÉCNICO / DESARROLLO</li>
                    <li>3. CONCLUSIONES Y RECOMENDACIONES</li>
                    <li>Cierre: «Es cuanto tengo a bien informar...»</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setModelToGenerate('INF');
                    setIsGenerateModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Redactar Informe</span>
                </button>
              </div>

              {/* Modelo 2: Comunicación Interna */}
              <div className="bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/40">
                      MODELO 2 • CI
                    </span>
                    <Send className="w-5 h-5 text-teal-500" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    COMUNICACIÓN INTERNA (NOTA)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-300 mt-1">
                    Intercambio administrativo formal entre áreas y despachos internos:
                  </p>
                  <ul className="text-[11px] text-slate-600 dark:text-teal-300/80 list-disc list-inside space-y-0.5 mt-2">
                    <li>Bloque normativo A:, DE:, REF.:, FECHA:</li>
                    <li>Cuerpo fluido con fórmula de cortesía</li>
                    <li>Firma de emisor e iniciales de responsabilidad</li>
                    <li>c.c. Archivo</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setModelToGenerate('CI');
                    setIsGenerateModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Redactar Comunicación Interna</span>
                </button>
              </div>

              {/* Modelo 3: Instructivo */}
              <div className={`bg-slate-50 dark:bg-[#06110D] border rounded-2xl p-5 space-y-3 flex flex-col justify-between transition-all ${
                allowedDocTypes.includes('INST') 
                  ? 'border-slate-200 dark:border-emerald-800/40' 
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-75'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      MODELO 3 • INST
                    </span>
                    {allowedDocTypes.includes('INST') ? (
                      <Scroll className="w-5 h-5 text-amber-500" />
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Gerencia
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    INSTRUCTIVO INSTITUCIONAL
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-300 mt-1">
                    Directrices de cumplimiento obligatorio emanadas por Gerencia o Jefaturas:
                  </p>
                  <ul className="text-[11px] text-slate-600 dark:text-amber-300/80 list-disc list-inside space-y-0.5 mt-2">
                    <li>Encabezado destacado INSTRUCTIVO</li>
                    <li>Artículos / puntos numerados de aplicación</li>
                    <li>Alcance de cumplimiento estricto para dependientes</li>
                    <li>Fecha de entrada en vigencia</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    if (!allowedDocTypes.includes('INST')) {
                      toast.error('Según Instructivo JOFHR 022-2026, los Instructivos están reservados para Gerencia General y Jefaturas autorizadas.');
                      return;
                    }
                    setModelToGenerate('INST');
                    setIsGenerateModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    allowedDocTypes.includes('INST')
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {allowedDocTypes.includes('INST') ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Redactar Instructivo</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Reservado para Gerencia</span>
                    </>
                  )}
                </button>
              </div>

              {/* Modelo 4: Memorándum */}
              <div className={`bg-slate-50 dark:bg-[#06110D] border rounded-2xl p-5 space-y-3 flex flex-col justify-between transition-all ${
                allowedDocTypes.includes('MEM') 
                  ? 'border-slate-200 dark:border-emerald-800/40' 
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-75'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                      MODELO 4 • MEM
                    </span>
                    {allowedDocTypes.includes('MEM') ? (
                      <Briefcase className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        JOFHR / RRHH
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    MEMORÁNDUM DE FUNCIONES
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-300 mt-1">
                    Comunicaciones directas al personal y colaboradores:
                  </p>
                  <ul className="text-[11px] text-slate-600 dark:text-indigo-300/80 list-disc list-inside space-y-0.5 mt-2">
                    <li>Designación de comisiones y funciones</li>
                    <li>Felicitaciones institucionales</li>
                    <li>Llamadas de atención y conminatorias</li>
                    <li>c.c. File Personal / Archivo</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    if (!allowedDocTypes.includes('MEM')) {
                      toast.error('Según Instructivo JOFHR 022-2026, los Memorándums están reservados para Gerencia General, JOFHR y Recursos Humanos.');
                      return;
                    }
                    setModelToGenerate('MEM');
                    setIsGenerateModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    allowedDocTypes.includes('MEM')
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {allowedDocTypes.includes('MEM') ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Redactar Memorándum</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Reservado JOFHR / RRHH</span>
                    </>
                  )}
                </button>
              </div>

              {/* Modelo 5: Carta Externa */}
              <div className={`bg-slate-50 dark:bg-[#06110D] border rounded-2xl p-5 space-y-3 flex flex-col justify-between transition-all ${
                allowedDocTypes.includes('NE') 
                  ? 'border-slate-200 dark:border-emerald-800/40' 
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-75'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40">
                      MODELO 5 • NE / CARTA
                    </span>
                    {allowedDocTypes.includes('NE') ? (
                      <Globe className="w-5 h-5 text-sky-500" />
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Gerencia Gral.
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    CARTA EXTERNA / NOTA EXTERNA
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-300 mt-1">
                    Correspondencia externa dirigida a instituciones y empresas:
                  </p>
                  <ul className="text-[11px] text-slate-600 dark:text-sky-300/80 list-disc list-inside space-y-0.5 mt-2">
                    <li>Fórmula CITE GG: CHLS-GG N° 00X/2026</li>
                    <li>Vocativo: Señor(a) [Nombre], [Cargo], [Empresa], Presente.-</li>
                    <li>Saludo: «De mi mayor consideración:»</li>
                    <li>Despedida formal y respetuosa</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    if (!allowedDocTypes.includes('NE')) {
                      toast.error('Según Instructivo JOFHR 022-2026, la correspondencia externa oficial con empresas e instituciones está reservada para Gerencia General (CHLS-GG).');
                      return;
                    }
                    setModelToGenerate('NE');
                    setIsGenerateModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    allowedDocTypes.includes('NE')
                      ? 'bg-sky-600 hover:bg-sky-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {allowedDocTypes.includes('NE') ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Redactar Carta Externa</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Exclusivo Gerencia General</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal Generador de CITE */}
      {isGenerateModalOpen && (
        <GenerateCiteModal
          isOpen={isGenerateModalOpen}
          initialDocType={modelToGenerate}
          currentPerspective={currentPerspective}
          canAccessAllAreas={effectiveCanAccessAll}
          onClose={() => setIsGenerateModalOpen(false)}
          onCiteCreated={() => {
            loadData();
          }}
        />
      )}

      {/* Modal de Anulación de CITE */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#091A14] border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-950 dark:text-white">
                Anular CITE Oficial: {cancelModalItem.citeCode}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Por normativa institucional, el correlativo no se eliminará ni se reutilizará. Quedará registrado en el Libro de Control como <strong>ANULADO</strong> para fines de auditoría.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Motivo / Justificación de la Anulación: *
              </label>
              <textarea
                rows={3}
                required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ej. Error en la redacción de la referencia / Solicitud desistida por el área..."
                className="w-full bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-rose-500/40 rounded-xl p-2.5 text-xs text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OfficialCitesLedgerModal;
