import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import {
  fetchRouteSheets,
  fetchCorrespondenceStats,
  setActiveFilter,
  setSearchQuery,
  setSelectedItem,
  handleRealtimeCreated,
  handleRealtimeUpdated,
} from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import { NewRouteSheetModal } from '../components/NewRouteSheetModal';
import { RouteSheetDetailModal } from '../components/RouteSheetDetailModal';
import { PrintableRouteSheet } from '../components/PrintableRouteSheet';
import { CorrespondenceConfigModal } from '../components/CorrespondenceConfigModal';
import {
  Search,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Printer,
  Sparkles,
  Leaf,
  Filter,
  ArrowRight,
  TrendingUp,
  Droplet,
  Wind,
  Layers,
  ChevronRight,
  Settings,
  Receipt,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import BackButton from '@shared/components/BackButton';
import { GatehouseInvoiceReceiptModal } from '../../gatehouse/components/GatehouseInvoiceReceiptModal';
import io from 'socket.io-client';

const FILTER_TABS = [
  { id: 'ALL', label: 'Todos' },
  { id: 'RECIBIDO', label: 'Recibidos (Mesa de Entrada)' },
  { id: 'DERIVADO', label: 'En Trámite / Derivados' },
  { id: 'OBSERVADO', label: 'Observados' },
  { id: 'CONCLUIDO', label: 'Concluidos' },
];

export const CorrespondenceHub: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, stats, isLoading, activeFilter, searchQuery, selectedItem } = useSelector(
    (state: RootState) => state.correspondence
  );

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [printableItem, setPrintableItem] = useState<RouteSheetItem | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');

  useEffect(() => {
    dispatch(fetchRouteSheets());
    dispatch(fetchCorrespondenceStats());

    // Socket.io Realtime Listener
    const socket = io(window.location.origin || 'http://localhost:5000');
    socket.on('correspondence:created', (data: RouteSheetItem) => {
      dispatch(handleRealtimeCreated(data));
      dispatch(fetchCorrespondenceStats());
    });

    socket.on('correspondence:updated', (data: any) => {
      dispatch(handleRealtimeUpdated(data));
      dispatch(fetchCorrespondenceStats());
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  // Client-side quick filter
  const filteredItems = items.filter((item) => {
    // Filter by tab status
    if (activeFilter === 'RECIBIDO' && item.status !== 'RECIBIDO') return false;
    if (activeFilter === 'DERIVADO' && !['DERIVADO', 'EN_PROCESO', 'EN_APROBACION', 'SUBSANADO'].includes(item.status)) return false;
    if (activeFilter === 'OBSERVADO' && item.status !== 'OBSERVADO') return false;
    if (activeFilter === 'CONCLUIDO' && item.status !== 'CONCLUIDO') return false;

    // Filter by area
    if (selectedAreaFilter !== 'ALL' && item.currentArea !== selectedAreaFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = item.hrCode.toLowerCase().includes(q);
      const matchRef = item.reference.toLowerCase().includes(q);
      const matchSender = item.senderName.toLowerCase().includes(q);
      const matchCite = item.cite?.toLowerCase().includes(q);
      const matchArea = item.senderArea?.toLowerCase().includes(q) || item.currentArea?.toLowerCase().includes(q);
      if (!matchCode && !matchRef && !matchSender && !matchCite && !matchArea) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECIBIDO':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'DERIVADO':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'EN_PROCESO':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'OBSERVADO':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse';
      case 'CONCLUIDO':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030805] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 relative overflow-hidden flex flex-col">
      {/* Background glow effects */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      {/* Top Header */}
      <header className="relative z-10 w-full p-4 sm:p-6 flex justify-between items-center border-b border-slate-200 dark:border-brand-gold/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <BackButton />
          <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Correspondencia & Hojas de Ruta</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                CHLS 360°
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Club Hípico Los Sargentos — Secretaría de Gerencia General
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            title="Recepción rápida de facturas (Luz, Agua, Gas, etc.)"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95"
          >
            <Receipt className="w-4 h-4 text-emerald-500" />
            <span className="hidden md:inline">Recibir Factura (Caseta)</span>
          </button>
          <ThemeToggle />
          <button
            onClick={() => setIsConfigModalOpen(true)}
            title="Parametrización & Matriz de Derivación"
            className="p-2.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Settings className="w-4 h-4 text-brand-gold" />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black font-black px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg shadow-brand-gold/25 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>+ Nueva Hoja de Ruta</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Eco-Metrics Bar (Iniciativa Cero Papel) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* 1. Hojas Ahorradas (Emerald Glow) */}
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#0d2a1c] dark:via-[#081c12] dark:to-[#030e08] border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-500 dark:hover:border-emerald-400 p-4 rounded-3xl backdrop-blur-xl shadow-[0_0_18px_rgba(16,185,129,0.12)] hover:shadow-[0_0_45px_rgba(16,185,129,0.5),0_0_80px_rgba(16,185,129,0.25)] flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Hojas Ahorradas
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.totalSheetsSaved || items.length * 3} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">hojas</span>
              </span>
            </div>
          </div>

          {/* 2. Árboles Salvados (Gold Glow) */}
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#2a220d] dark:via-[#1c1708] dark:to-[#0e0c03] border border-brand-gold/30 dark:border-brand-gold/40 hover:border-brand-gold dark:hover:border-yellow-400 p-4 rounded-3xl backdrop-blur-xl shadow-[0_0_18px_rgba(204,161,75,0.12)] hover:shadow-[0_0_45px_rgba(204,161,75,0.5),0_0_80px_rgba(204,161,75,0.25)] flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(204,161,75,0.5)]">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Árboles Salvados
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.treesSaved || '0.12'} <span className="text-xs font-bold text-brand-gold">árboles</span>
              </span>
            </div>
          </div>

          {/* 3. Agua Preservada (Cyan Glow) */}
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#0d262a] dark:via-[#08191c] dark:to-[#030d0e] border border-cyan-500/30 dark:border-cyan-500/40 hover:border-cyan-500 dark:hover:border-cyan-400 p-4 rounded-3xl backdrop-blur-xl shadow-[0_0_18px_rgba(6,182,212,0.12)] hover:shadow-[0_0_45px_rgba(6,182,212,0.5),0_0_80px_rgba(6,182,212,0.25)] flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Agua Preservada
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.waterSavedLiters || items.length * 30} <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Litros</span>
              </span>
            </div>
          </div>

          {/* 4. CO₂ Evitado (Purple Glow) */}
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#250d2a] dark:via-[#18081c] dark:to-[#0c030e] border border-purple-500/30 dark:border-purple-500/40 hover:border-purple-500 dark:hover:border-purple-400 p-4 rounded-3xl backdrop-blur-xl shadow-[0_0_18px_rgba(168,85,247,0.12)] hover:shadow-[0_0_45px_rgba(168,85,247,0.5),0_0_80px_rgba(168,85,247,0.25)] flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                CO₂ Evitado
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.co2SavedKg || '0.45'} <span className="text-xs font-bold text-purple-600 dark:text-purple-400">kg CO₂</span>
              </span>
            </div>
          </div>

        </div>

        {/* Filter Controls (Apple Minimalist Bar) */}
        <div className="bg-white/90 dark:bg-[#0a100d]/90 border border-slate-200/80 dark:border-brand-gold/20 p-3 sm:p-4 rounded-3xl shadow-sm backdrop-blur-md space-y-3">
          
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por N° de Hoja de Ruta (ej. 08-193), remitente, CITE o asunto..."
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all font-medium"
              />
            </div>

            {/* Filter by Area */}
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-gold/50 outline-none cursor-pointer"
              >
                <option value="ALL">Todas las Áreas</option>
                <option value="SECRETARIA_GENERAL">Secretaría General</option>
                <option value="GERENCIA_GENERAL">Gerencia General</option>
                <option value="CONTRATACIONES Y ADQUISICIONES">Contrataciones</option>
                <option value="TESORERÍA Y FINANZAS">Tesorería</option>
                <option value="COMISIÓN HÍPICA">Comisión Hípica</option>
                <option value="CAPITANÍA DEPORTES / TENIS">Capitanía Deportes</option>
                <option value="ASESORÍA LEGAL">Asesoría Legal</option>
                <option value="MANTENIMIENTO Y OBRAS">Mantenimiento</option>
                <option value="DIRECTORIO / PRESIDENCIA">Directorio</option>
              </select>
            </div>
          </div>

          {/* Segmented Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => dispatch(setActiveFilter(tab.id))}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 dark:bg-brand-gold text-white dark:text-black shadow-sm'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>

        {/* Route Sheets List / Grid */}
        {isLoading ? (
          <div className="text-center py-20 bg-white/40 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
            <Clock className="w-10 h-10 text-brand-gold animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-gray-300">Cargando Hojas de Ruta...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white/60 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                No se encontraron Hojas de Ruta
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                No hay trámites que coincidan con los filtros seleccionados o aún no se han radicado documentos.
              </p>
            </div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-black bg-brand-gold text-black px-4 py-2 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Generar primera Hoja de Ruta</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => dispatch(setSelectedItem(item))}
                className="group bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 dark:bg-gradient-to-br dark:from-[#0d2a1c] dark:via-[#081c12] dark:to-[#030e08] border-2 border-emerald-500/50 dark:border-emerald-400/60 hover:border-emerald-600 dark:hover:border-emerald-300 p-5 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.2),0_10px_25px_rgba(0,0,0,0.3)] hover:shadow-[0_0_55px_rgba(16,185,129,0.5),0_0_90px_rgba(16,185,129,0.25)] transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden backdrop-blur-xl hover:scale-[1.02]"
              >
                {/* Priority Color Stripe with high intensity glow */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    item.priority === 'URGENTE'
                      ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shadow-[0_0_16px_rgba(239,68,68,0.8)]'
                      : item.priority === 'ALTA'
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                      : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]'
                  }`}
                />

                <div className="space-y-3 pt-1">
                  {/* Top Line: Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-emerald-950 dark:text-emerald-200 bg-emerald-500/25 dark:bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/60 dark:border-emerald-400/70 shadow-[0_0_14px_rgba(16,185,129,0.35)] tracking-wider">
                      {item.hrCode}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Reference / Asunto */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-950 dark:text-gray-100 line-clamp-2 uppercase leading-snug group-hover:text-emerald-700 dark:group-hover:text-brand-gold transition-colors">
                      {item.reference}
                    </h4>
                    {item.cite && (
                      <span className="text-[10.5px] text-emerald-800 dark:text-emerald-300/90 font-mono font-bold block mt-1">
                        CITE: {item.cite} • {item.pageCount || 1} fojas
                      </span>
                    )}
                  </div>

                  {/* Sender & Area Info */}
                  <div className="space-y-1.5 pt-2 border-t border-emerald-500/25 dark:border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-gray-200">
                      <User className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                      <span className="font-bold truncate">{item.senderName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-emerald-300/80">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-semibold truncate">
                        {item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Location & Quick Print */}
                <div className="mt-4 pt-3 border-t border-emerald-500/25 dark:border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-gray-300">
                    <span className="text-slate-500 dark:text-gray-400 font-normal">En:</span>
                    <span className="text-emerald-800 dark:text-brand-gold uppercase truncate max-w-[130px] font-black">
                      {item.currentArea}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintableItem(item);
                      }}
                      title="Imprimir Hoja de Ruta 1:1"
                      className="p-1.5 rounded-xl bg-emerald-500/20 dark:bg-emerald-950/80 hover:bg-emerald-500/30 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Modal New Route Sheet */}
      {isNewModalOpen && (
        <NewRouteSheetModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}

      {/* Modal Detail Expediente */}
      {selectedItem && (
        <RouteSheetDetailModal
          item={selectedItem}
          onClose={() => dispatch(setSelectedItem(null))}
        />
      )}

      {/* Modal Printable Sheet */}
      {printableItem && (
        <PrintableRouteSheet
          item={printableItem}
          onClose={() => setPrintableItem(null)}
        />
      )}

      {/* Modal Parametrization & Configuration */}
      {isConfigModalOpen && (
        <CorrespondenceConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
        />
      )}

      {/* Modal Invoice Receipt for Gatehouse */}
      {isInvoiceModalOpen && (
        <GatehouseInvoiceReceiptModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            dispatch(fetchRouteSheets());
            dispatch(fetchCorrespondenceStats());
          }}
        />
      )}
    </div>
  );
};
export default CorrespondenceHub;
