import React, { useState, useMemo } from 'react';
import { RouteSheetItem } from '../types/correspondence.types';
import {
  X,
  Compass,
  MapPin,
  Building2,
  Clock,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  Copy,
  ExternalLink,
  Flame,
  Calendar,
  Layers,
  FolderArchive,
  RotateCcw,
  Sparkles,
  Inbox,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';
import { DEFAULT_ORGANIGRAM_NODES, isSameArea } from '../utils/organigramWorkflowService';

interface RouteSheetLocatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: RouteSheetItem[];
  workflow?: any;
  onSelectItem: (item: RouteSheetItem) => void;
  initialArea?: string;
}

type QuickFilterType = 'ALL' | 'STAGNANT' | 'OVERDUE' | 'URGENT' | 'ARCHIVED';

export const RouteSheetLocatorModal: React.FC<RouteSheetLocatorModalProps> = ({
  isOpen,
  onClose,
  items,
  workflow,
  onSelectItem,
  initialArea,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>(initialArea || 'ALL');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('ALL');

  if (!isOpen) return null;

  // Lista de nodos oficiales del organigrama
  const organigramNodes = useMemo(() => {
    return workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;
  }, [workflow]);

  // Helper para obtener el responsable oficial de un área
  const getAreaInfo = (areaName: string) => {
    const found = organigramNodes.find(
      (n: any) => isSameArea(n.title, areaName) || isSameArea(n.areaKey, areaName)
    );
    if (found) {
      return {
        manager: found.manager || 'Responsable de Despacho',
        subtitle: found.subtitle || 'Área Oficial CHLS',
      };
    }
    return {
      manager: 'Titular Asignado',
      subtitle: 'Despacho Institucional',
    };
  };

  // Helper de cálculo de tiempo en despacho actual
  const calculateStayTime = (item: RouteSheetItem) => {
    const lastMove = item.movements && item.movements.length > 0
      ? item.movements[item.movements.length - 1]
      : null;

    const dateStr = lastMove?.receivedAt || lastMove?.createdAt || item.updatedAt || item.createdAt;
    const lastDate = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - lastDate.getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;

    let text = '';
    if (totalHours < 1) {
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      text = `Hace ${mins} min`;
    } else if (days === 0) {
      text = `${totalHours} ${totalHours === 1 ? 'hora' : 'horas'}`;
    } else {
      text = `${days}d ${remHours}h`;
    }

    const isStagnant = totalHours >= 48 && item.status !== 'CONCLUIDO' && item.status !== 'ANULADO';

    return {
      text,
      totalHours,
      days,
      isStagnant,
      lastDate,
      lastSourceArea: lastMove?.sourceArea,
      lastInstruction: lastMove?.instruction,
      lastSenderPerson: lastMove?.sourceUser?.firstName
        ? `${lastMove.sourceUser.firstName} ${lastMove.sourceUser.lastName}`
        : undefined,
    };
  };

  // Agrupar conteo de hojas de ruta por despacho actual
  const areaDistribution = useMemo(() => {
    const map: Record<string, { count: number; overdueCount: number; stagnantCount: number }> = {};

    items.forEach((item) => {
      const area = item.currentArea || 'SIN ÁREA ASIGNADA';
      if (!map[area]) {
        map[area] = { count: 0, overdueCount: 0, stagnantCount: 0 };
      }
      map[area].count += 1;

      if (item.slaStatus === 'OVERDUE' || item.isOverdue) {
        map[area].overdueCount += 1;
      }

      const stay = calculateStayTime(item);
      if (stay.isStagnant) {
        map[area].stagnantCount += 1;
      }
    });

    return map;
  }, [items]);

  // Despachos ordenados por mayor cantidad de expedientes
  const sortedAreas = useMemo(() => {
    return Object.entries(areaDistribution).sort((a, b) => b[1].count - a[1].count);
  }, [areaDistribution]);

  // Filtrado de expedientes según búsqueda, área y filtro de urgencia
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filtro por Área
      if (selectedArea !== 'ALL' && !isSameArea(item.currentArea, selectedArea)) {
        return false;
      }

      // 2. Filtro de Urgencia / Estado
      const stay = calculateStayTime(item);
      if (quickFilter === 'STAGNANT' && !stay.isStagnant) return false;
      if (quickFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE' && !item.isOverdue) return false;
      if (quickFilter === 'URGENT' && item.priority !== 'URGENTE' && item.priority !== 'ALTA') return false;
      if (quickFilter === 'ARCHIVED' && item.status !== 'CONCLUIDO' && item.status !== 'ANULADO' && !item.archiveLocation) return false;

      // 3. Filtro por Búsqueda de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.hrCode.toLowerCase().includes(q);
        const matchCite = (item.cite || '').toLowerCase().includes(q);
        const matchRef = item.reference.toLowerCase().includes(q);
        const matchSender = item.senderName.toLowerCase().includes(q);
        const matchArea = (item.currentArea || '').toLowerCase().includes(q) || (item.senderArea || '').toLowerCase().includes(q);
        const matchArchive = (item.archiveLocation || '').toLowerCase().includes(q);
        const matchMovements = item.movements?.some(
          (m) =>
            (m.sourceArea && m.sourceArea.toLowerCase().includes(q)) ||
            (m.targetArea && m.targetArea.toLowerCase().includes(q)) ||
            (m.targetPersonName && m.targetPersonName.toLowerCase().includes(q)) ||
            (m.instruction && m.instruction.toLowerCase().includes(q))
        );

        if (!matchCode && !matchCite && !matchRef && !matchSender && !matchArea && !matchArchive && !matchMovements) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedArea, quickFilter, searchQuery]);

  // Métricas generales de ubicación
  const statsSummary = useMemo(() => {
    const totalActive = items.filter((i) => i.status !== 'CONCLUIDO' && i.status !== 'ANULADO').length;
    const totalStagnant = items.filter((i) => calculateStayTime(i).isStagnant).length;
    const totalOverdue = items.filter((i) => i.slaStatus === 'OVERDUE' || i.isOverdue).length;
    const totalArchived = items.filter((i) => i.status === 'CONCLUIDO' || i.status === 'ANULADO' || !!i.archiveLocation).length;
    const activeOffices = Object.keys(areaDistribution).filter((k) => areaDistribution[k].count > 0).length;

    return { totalActive, totalStagnant, totalOverdue, totalArchived, activeOffices };
  }, [items, areaDistribution]);

  const copyHrCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado al portapapeles`, { icon: '📋' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-center p-2 sm:p-4 lg:p-6 animate-fadeIn">
      <div className="bg-[#f8fafc] dark:bg-[#07110c] border-2 border-emerald-500/40 w-full max-w-[1620px] h-[92vh] rounded-3xl shadow-[0_0_90px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col justify-between">
        
        {/* ========================================================================= */}
        {/* CABECERA: TÍTULO, LOGO Y CONTROL DE CIERRE */}
        {/* ========================================================================= */}
        <div className="px-6 sm:px-8 py-4 border-b border-emerald-500/30 flex justify-between items-center bg-white/90 dark:bg-[#091810] shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-gold/20 to-emerald-500/20 border border-brand-gold/40 shadow-[0_0_20px_rgba(204,161,75,0.3)]">
              <Compass className="w-8 h-8 text-brand-gold animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                  <span>UBICADOR DE HOJAS DE RUTA</span>
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                    RADAR 360°
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                Localización exacta, despacho responsable y tiempo de permanencia de expedientes en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-red-500/20 hover:text-red-500 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Cerrar localizador"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUERPO PRINCIPAL */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6">

          {/* 1. BARRA DE MÉTRICAS / KPIS DE UBICACIÓN */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            
            {/* Activas en Despachos */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1a13] border-2 border-emerald-500/30 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-gray-400 block tracking-wider">
                  En Circulación
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {statsSummary.totalActive}
                </span>
              </div>
            </div>

            {/* Despachos Activos */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1a13] border-2 border-slate-200 dark:border-emerald-500/30 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-gray-400 block tracking-wider">
                  Despachos con Carga
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {statsSummary.activeOffices}
                </span>
              </div>
            </div>

            {/* Retenidas / Estancadas (>48h) */}
            <div
              onClick={() => setQuickFilter(quickFilter === 'STAGNANT' ? 'ALL' : 'STAGNANT')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                quickFilter === 'STAGNANT'
                  ? 'bg-amber-500/20 border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-[#0c1a13] border-amber-500/30 hover:border-amber-500/60'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-amber-700 dark:text-amber-400 block tracking-wider">
                  Estancadas (&gt;48h)
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-900 dark:text-amber-300">
                  {statsSummary.totalStagnant}
                </span>
              </div>
            </div>

            {/* SLA Vencido */}
            <div
              onClick={() => setQuickFilter(quickFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                quickFilter === 'OVERDUE'
                  ? 'bg-red-500/20 border-red-500 shadow-md shadow-red-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-[#0c1a13] border-red-500/30 hover:border-red-500/60'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-red-700 dark:text-red-400 block tracking-wider">
                  SLA Vencido
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-red-900 dark:text-red-300">
                  {statsSummary.totalOverdue}
                </span>
              </div>
            </div>

            {/* En Archivo Central */}
            <div
              onClick={() => setQuickFilter(quickFilter === 'ARCHIVED' ? 'ALL' : 'ARCHIVED')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                quickFilter === 'ARCHIVED'
                  ? 'bg-purple-500/20 border-purple-500 shadow-md shadow-purple-500/20 scale-[1.02]'
                  : 'bg-white dark:bg-[#0c1a13] border-purple-500/30 hover:border-purple-500/60'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FolderArchive className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-purple-700 dark:text-purple-400 block tracking-wider">
                  Archivo Central
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-purple-900 dark:text-purple-300">
                  {statsSummary.totalArchived}
                </span>
              </div>
            </div>

          </div>

          {/* 2. BUSCADOR INTELIGENTE & FILTROS RÁPIDOS */}
          <div className="bg-white dark:bg-[#0c1a13] border-2 border-slate-200 dark:border-emerald-500/30 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-500" />
                <input
                  type="text"
                  placeholder="Localizar por N° de Hoja de Ruta (ej. 08-193), CITE, Remitente, Asunto o Despacho..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-emerald-500/30 rounded-2xl text-xs sm:text-sm text-slate-950 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Botón Restaurar Filtros */}
              {(selectedArea !== 'ALL' || quickFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArea('ALL');
                    setQuickFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-200 text-xs font-black transition-all shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restablecer Filtros</span>
                </button>
              )}
            </div>

            {/* Selector Visual de Despachos del Organigrama */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Filtrar por Despacho de Custodia:</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {sortedAreas.length} despachos activos
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedArea('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                    selectedArea === 'ALL'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-100 dark:bg-black/50 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-emerald-500/20 hover:border-emerald-500'
                  }`}
                >
                  Todos los Despachos ({items.length})
                </button>

                {sortedAreas.map(([area, stat]) => {
                  const isSelected = selectedArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedArea(isSelected ? 'ALL' : area)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-brand-gold text-slate-950 border-amber-300 shadow-md shadow-brand-gold/30'
                          : 'bg-slate-100 dark:bg-black/50 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-emerald-500/20 hover:border-brand-gold'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-emerald-500'}`} />
                      <span className="truncate max-w-[170px]">{area}</span>
                      <span
                        className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-black text-brand-gold'
                            : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {stat.count}
                      </span>
                      {stat.stagnantCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="Trámites retenidos" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. RESULTADOS DEL RADAR (LISTADO DE EXPEDIENTES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase text-slate-700 dark:text-gray-300 tracking-wider">
                Expedientes Localizados ({filteredItems.length}):
              </span>
              {selectedArea !== 'ALL' && (
                <span className="text-xs font-black text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-lg border border-brand-gold/30">
                  Ubicación: {selectedArea}
                </span>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0c1a13] border-2 border-dashed border-slate-300 dark:border-emerald-500/30">
                <Compass className="w-12 h-12 text-slate-400 dark:text-emerald-500/40 mx-auto mb-3 animate-pulse" />
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  No se encontraron hojas de ruta en esta ubicación
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  Prueba cambiando el despacho seleccionado o el término de búsqueda para localizar otros expedientes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArea('ALL');
                    setQuickFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors"
                >
                  Ver Todos los Expedientes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const stay = calculateStayTime(item);
                  const areaInfo = getAreaInfo(item.currentArea);

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="group p-5 rounded-3xl bg-white dark:bg-[#0c1a13] border-2 border-slate-200 dark:border-emerald-500/30 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-md hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all flex flex-col justify-between cursor-pointer space-y-4"
                    >
                      {/* Cabecera de la Tarjeta */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 group-hover:text-brand-gold transition-colors">
                              HR {item.hrCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => copyHrCode(item.hrCode, e)}
                              title="Copiar código"
                              className="text-slate-400 hover:text-brand-gold transition-colors p-0.5"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {item.cite && (
                              <span className="text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                                CITE: {item.cite}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-gray-400 block mt-0.5">
                            Remitente: <strong className="text-slate-800 dark:text-gray-200">{item.senderName}</strong> ({item.senderArea || 'Externo'})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              item.priority === 'URGENTE'
                                ? 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40'
                                : item.priority === 'ALTA'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span
                            className={`text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              item.status === 'CONCLUIDO'
                                ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40'
                                : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Referencia / Asunto */}
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {item.reference}
                        </p>
                      </div>

                      {/* CAJA DE UBICACIÓN ACTUAL DESTACADA (RADAR DE CUSTODIA) */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-brand-gold/10 border border-emerald-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-gold animate-bounce" />
                            <span>Ubicación Actual del Expediente:</span>
                          </span>

                          {/* Semáforo de Permanencia */}
                          <span
                            className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              stay.isStagnant
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{stay.text} en despacho</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-black text-slate-950 dark:text-brand-gold uppercase block">
                              {item.currentArea}
                            </span>
                            <span className="text-xs font-medium text-slate-600 dark:text-gray-300 flex items-center gap-1 mt-0.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{areaInfo.manager}</span>
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-gray-400 block">
                              {item.pageCount || 1} fojas
                            </span>
                            {item.documents && item.documents.length > 0 && (
                              <span className="text-[10px] text-brand-gold font-mono font-bold">
                                📎 {item.documents.length} digitalizados
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Última Instrucción o Ubicación Física */}
                        {item.archiveLocation ? (
                          <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1.5">
                            <FolderArchive className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                            <span>Archivador Físico: {item.archiveLocation} {item.archiveBox ? `(Caja ${item.archiveBox})` : ''}</span>
                          </div>
                        ) : stay.lastInstruction ? (
                          <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-slate-600 dark:text-gray-300 line-clamp-1 italic">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 not-italic">Último proveído:</span> "{stay.lastInstruction}"
                          </div>
                        ) : null}
                      </div>

                      {/* Botón de Acción Directa */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          Radicado el {new Date(item.createdAt).toLocaleDateString('es-BO')}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-brand-gold group-hover:underline">
                          <span>Abrir Expediente</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* PIE DEL MODAL: RESUMEN Y BOTÓN DE SALIDA */}
        {/* ========================================================================= */}
        <div className="px-6 sm:px-8 py-3.5 border-t border-emerald-500/30 flex justify-between items-center bg-white/90 dark:bg-[#091810] shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Trazabilidad Oficial en Tiempo Real • Sistema SICAD Club Hípico Los Sargentos</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-black text-xs transition-colors cursor-pointer"
          >
            Cerrar Ubicador
          </button>
        </div>

      </div>
    </div>
  );
};
