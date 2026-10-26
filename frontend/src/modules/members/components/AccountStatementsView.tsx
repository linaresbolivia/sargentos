import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  DollarSign, 
  Users, 
  Calendar, 
  ChevronRight, 
  Filter, 
  ArrowUpDown, 
  Download,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { api } from '@config/api';

interface SummaryMetrics {
  totalMemberships: number;
  totalCarteraBs: number;
  sinDeudaCount: number;
  unMesCount: number;
  dosMasMesesCount: number;
  lastSyncDate: string | null;
  toleranceRule: string;
  ruleDescription: string;
}

interface AccountStatementItem {
  id: string;
  membershipNumber: string;
  membershipStatus: string;
  totalDebt: number;
  debtStatus: string;
  debtMonthsCount: number;
  debtBreakdown: {
    oct26?: number;
    sept26?: number;
    ago26?: number;
    jul26?: number;
    jun26?: number;
    may26?: number;
    mas6meses?: number;
    cutOffDate?: string;
    originalMora?: string;
  } | null;
  lastDebtSync: string | null;
  accessRuleResult: 'GRANTED' | 'WARNING' | 'DENIED';
  accessReason: string;
  titular: {
    id: string;
    fullName: string;
    documentId: string;
    alphaCode: string;
    email: string | null;
    mobile: string | null;
    photoUrl: string | null;
    typeName: string;
  };
}

export const AccountStatementsView: React.FC = () => {
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [statements, setStatements] = useState<AccountStatementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SIN_DEUDA' | '1_MES' | 'BLOQUEADOS'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal for detail
  const [selectedItem, setSelectedItem] = useState<AccountStatementItem | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/members/admin/account-statements/summary');
      if (res.data?.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching account statements summary:', err);
    }
  };

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/members/admin/account-statements/list', {
        params: {
          search: searchTerm,
          statusFilter: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          limit: 25
        }
      });
      if (res.data?.success) {
        setStatements(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching statements list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchList();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchList();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleSyncDefault = async () => {
    setIsSyncing(true);
    setSyncFeedback('Procesando PDF oficial de Cartera Especial y actualizando 1.600 socios...');
    try {
      const res = await api.post('/members/admin/account-statements/sync-default');
      if (res.data?.success) {
        setSyncFeedback(`✅ ¡Sincronización completada! ${res.data.data.totalUpdated} socios actualizados con éxito en ${((res.data.data.executionTimeMs || 0) / 1000).toFixed(1)}s.`);
        await fetchSummary();
        await fetchList();
      } else {
        setSyncFeedback(`⚠️ ${res.data?.message || 'Error en la sincronización'}`);
      }
    } catch (err: any) {
      setSyncFeedback(`❌ Error al sincronizar: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 8000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('cutOffDate', '15/10/2026');

    setIsSyncing(true);
    setSyncFeedback(`Subiendo y analizando documento PDF: ${file.name}...`);
    try {
      const res = await api.post('/members/admin/account-statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        setSyncFeedback(`✅ ¡PDF procesado con éxito! ${res.data.data.totalUpdated} socios actualizados.`);
        await fetchSummary();
        await fetchList();
      }
    } catch (err: any) {
      setSyncFeedback(`❌ Error al subir PDF: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 8000);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#121e17] p-6 rounded-2xl border border-gray-200 dark:border-brand-gold/20 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-brand-gold/10 border border-amber-500/30 dark:border-brand-gold/30 flex items-center justify-center text-amber-600 dark:text-brand-gold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Estado de Cuentas & Cartera Especial
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Enlace Activo con Garita
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Regla de Admisión: <strong>1 mes de mora</strong> = Advertencia informativa en garita • <strong>2+ meses de mora</strong> = Bloqueo total de ingreso
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#1a2c22] border border-gray-300 dark:border-white/10 hover:border-brand-gold text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-all flex items-center gap-2 shadow-sm">
            <Upload className="w-4 h-4 text-brand-gold" />
            <span>Subir Nuevo PDF</span>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isSyncing}
            />
          </label>

          <button
            onClick={handleSyncDefault}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Cartera Especial'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Feedback Alert */}
      {syncFeedback && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cartera */}
        <div className="bg-white dark:bg-[#121e17] p-5 rounded-2xl border border-gray-200 dark:border-brand-gold/15 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Cartera en Mora</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                Bs. {metrics ? metrics.totalCarteraBs.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Corte: 15/10/2026 ({metrics?.totalMemberships || 1600} socios)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-brand-gold flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Al Día (Verde) */}
        <div className="bg-white dark:bg-[#121e17] p-5 rounded-2xl border border-emerald-500/20 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Socios Al Día</p>
              </div>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics ? metrics.sinDeudaCount : '...'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Acceso 100% Autorizado en Garita
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 1 Mes Mora (Amarillo) */}
        <div className="bg-white dark:bg-[#121e17] p-5 rounded-2xl border border-yellow-500/20 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">1 Mes (Advertencia)</p>
              </div>
              <h3 className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mt-1">
                {metrics ? metrics.unMesCount : '...'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Pasa con recordatorio de regularización
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2+ Meses (Bloqueados Rojo) */}
        <div className="bg-white dark:bg-[#121e17] p-5 rounded-2xl border border-rose-500/20 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">2+ Meses (Bloqueados)</p>
              </div>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {metrics ? metrics.dosMasMesesCount : '...'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Acceso Denegado por Garita
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white dark:bg-[#121e17] p-5 rounded-2xl border border-gray-200 dark:border-brand-gold/15 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/30 p-1.5 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-white dark:bg-[#1e3428] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'}`}
            >
              Todos ({totalCount || (metrics?.totalMemberships || 0)})
            </button>
            <button
              onClick={() => { setStatusFilter('SIN_DEUDA'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'SIN_DEUDA' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'}`}
            >
              Al Día ({metrics?.sinDeudaCount || 0})
            </button>
            <button
              onClick={() => { setStatusFilter('1_MES'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === '1_MES' ? 'bg-yellow-500 text-black shadow-sm' : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10'}`}
            >
              1 Mes ({metrics?.unMesCount || 0})
            </button>
            <button
              onClick={() => { setStatusFilter('BLOQUEADOS'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'BLOQUEADOS' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'}`}
            >
              2+ Meses Bloqueados ({metrics?.dosMasMesesCount || 0})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° Socio, Nombre, CI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-gold transition-all"
            />
          </div>
        </div>

        {/* Table of Members */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/40 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-bold">N° Socio</th>
                <th className="py-3.5 px-4 font-bold">Socio Titular</th>
                <th className="py-3.5 px-4 font-bold">Tipo</th>
                <th className="py-3.5 px-4 font-bold text-right">Saldo Deudor</th>
                <th className="py-3.5 px-4 font-bold text-center">Mora</th>
                <th className="py-3.5 px-4 font-bold">Impacto en Garita</th>
                <th className="py-3.5 px-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-gold" />
                    Cargando estados de cuenta...
                  </td>
                </tr>
              ) : statements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No se encontraron socios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                statements.map((item) => {
                  const isZero = item.totalDebt === 0;
                  const isWarning = item.accessRuleResult === 'WARNING';
                  const isBlocked = item.accessRuleResult === 'DENIED';

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-brand-gold">
                        #{item.membershipNumber}
                      </td>

                      {/* Titular */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-brand-gold flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-amber-500/20">
                            {item.titular.fullName.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-tight">
                              {item.titular.fullName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              CI: {item.titular.documentId || 'N/A'} {item.titular.alphaCode ? `• ${item.titular.alphaCode}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {item.titular.typeName || 'Titular'}
                      </td>

                      {/* Debt Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isZero ? 'text-emerald-600 dark:text-emerald-400' : isWarning ? 'text-yellow-600 dark:text-yellow-400' : 'text-rose-600 dark:text-rose-400 text-sm'}>
                          Bs. {item.totalDebt.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Months */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isZero 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : isWarning 
                            ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-black'
                        }`}>
                          {item.debtMonthsCount === 0 ? 'Al Día' : `${item.debtMonthsCount} ${item.debtMonthsCount === 1 ? 'Mes' : 'Meses'}`}
                        </span>
                      </td>

                      {/* Access Impact */}
                      <td className="py-3 px-4">
                        {isZero ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Acceso Permitido</span>
                          </div>
                        ) : isWarning ? (
                          <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-semibold">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Permitido (Aviso regularizar)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>⛔ ACCESO BLOQUEADO</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-white/5 hover:bg-brand-gold hover:text-black dark:text-gray-300 transition-colors"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
          <p>
            Mostrando página {page} de {totalPages} ({totalCount} socios encontrados)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-brand-gold disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="font-bold text-gray-900 dark:text-white px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-brand-gold disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Detalle de Cuenta del Socio */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121e17] rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-gold">
                  Ficha de Estado de Cuenta • Socio #{selectedItem.membershipNumber}
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {selectedItem.titular.fullName}
                </h3>
                <p className="text-xs text-gray-400">
                  CI: {selectedItem.titular.documentId} • {selectedItem.titular.typeName}
                </p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Access Decision Banner */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                selectedItem.accessRuleResult === 'GRANTED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : selectedItem.accessRuleResult === 'WARNING'
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                {selectedItem.accessRuleResult === 'GRANTED' ? (
                  <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-500" />
                ) : selectedItem.accessRuleResult === 'WARNING' ? (
                  <AlertTriangle className="w-8 h-8 shrink-0 text-yellow-500" />
                ) : (
                  <ShieldAlert className="w-8 h-8 shrink-0 text-rose-500" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {selectedItem.accessRuleResult === 'GRANTED'
                      ? 'Acceso Permitido en Garita'
                      : selectedItem.accessRuleResult === 'WARNING'
                      ? 'Acceso Permitido con Advertencia'
                      : 'ACCESO BLOQUEADO EN GARITA'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {selectedItem.accessReason}
                  </p>
                </div>
              </div>

              {/* Debt Detail Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl border border-gray-200 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Saldo Total Deudor</span>
                  <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5 font-mono">
                    Bs. {selectedItem.totalDebt.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl border border-gray-200 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Meses en Mora</span>
                  <p className="text-lg font-black text-amber-500 mt-0.5">
                    {selectedItem.debtMonthsCount} {selectedItem.debtMonthsCount === 1 ? 'Mes' : 'Meses'}
                  </p>
                </div>
              </div>

              {/* Month by month breakdown */}
              {selectedItem.debtBreakdown && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Desglose por Mes (Corte Cartera Especial 15/10/2026)
                  </h5>
                  <div className="bg-gray-50 dark:bg-black/30 rounded-xl p-3 border border-gray-200 dark:border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Octubre 2026:</span>
                      <span className="font-mono font-bold">Bs. {Number(selectedItem.debtBreakdown.oct26 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Septiembre 2026:</span>
                      <span className="font-mono font-bold">Bs. {Number(selectedItem.debtBreakdown.sept26 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Agosto 2026:</span>
                      <span className="font-mono font-bold">Bs. {Number(selectedItem.debtBreakdown.ago26 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Julio 2026:</span>
                      <span className="font-mono font-bold">Bs. {Number(selectedItem.debtBreakdown.jul26 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Junio 2026:</span>
                      <span className="font-mono font-bold">Bs. {Number(selectedItem.debtBreakdown.jun26 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Mayo 2026:</span>
                      <span className="font-mono font-bold">Bs. {Number(selectedItem.debtBreakdown.may26 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Anteriores acumulados (&gt; 6 meses):</span>
                      <span className="font-mono font-bold text-rose-400">Bs. {Number(selectedItem.debtBreakdown.mas6meses || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-black/40 border-t border-gray-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-gold text-black hover:bg-amber-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
