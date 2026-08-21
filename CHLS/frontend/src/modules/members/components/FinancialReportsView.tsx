import React, { useState, useEffect } from 'react';
import { Download, Filter, TrendingUp, DollarSign, Calendar, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { memberAdminApi } from '../services/memberAdminApi';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export const FinancialReportsView: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'CARTERA' | 'RECAUDACION'>('CARTERA');
  
  const [carteraData, setCarteraData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [categoryFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [carteraRes, revRes] = await Promise.all([
        memberAdminApi.getCarteraSaneada(categoryFilter),
        memberAdminApi.getRevenueSummary()
      ]);
      setCarteraData(carteraRes.data);
      setRevenueData(revRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCarteraExcel = () => {
    if (!carteraData?.rows) return;
    const ws = XLSX.utils.json_to_sheet(carteraData.rows.map((r: any) => ({
      'Código Alfa': r.alphaCode,
      'Socio': r.fullName,
      'Membresía': r.membershipNumber,
      'Categoría': r.category,
      'Mora 1-2 Meses (Bs)': r.mora1a2Meses,
      'Mora 3-6 Meses (Bs)': r.mora3a6Meses,
      'Mora > 6 Meses (Bs)': r.moraMas6Meses,
      'Total Mora Real Devengada (Bs)': r.totalMoraRealDevengada
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cartera_Especial_Saneada');
    XLSX.writeFile(wb, `Cartera_Especial_Saneada_CHLS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 border-l-4 border-emerald-500 bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
              Auditoría & Finanzas
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Corrección Definitiva del Sistema Novus</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Cartera Especial Saneada & Reportes Gerenciales
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cálculo de mora vencida devengada real a la fecha de consulta (sin inflación de cuotas futuras a 5 años no devengadas).
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExportCarteraExcel}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-gray-300 dark:border-white/10 shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
          <button 
            onClick={loadReports}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveReportTab('CARTERA')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeReportTab === 'CARTERA' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:text-gray-900 dark:hover:text-white'}`}
        >
          📋 Cartera Especial Saneada
        </button>
        <button
          onClick={() => setActiveReportTab('RECAUDACION')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeReportTab === 'RECAUDACION' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:text-gray-900 dark:hover:text-white'}`}
        >
          📈 Tendencia de Recaudación Mensual
        </button>
      </div>

      {/* TAB 1: CARTERA ESPECIAL SANEADA */}
      {activeReportTab === 'CARTERA' && (
        <div className="space-y-6">
          
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-brand-gold/30 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Mora Real Devengada</p>
              <p className="text-2xl font-black text-amber-800 dark:text-brand-gold font-mono mt-1">
                Bs {Number(carteraData?.summary?.totalCarteraGeneral || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">✓ Saneada sin cuotas futuras</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-amber-500/30 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">1 a 2 Meses (Gracia)</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                Bs {Number(carteraData?.summary?.totalCarteraMes1a2 || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-orange-500/30 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">3 a 6 Meses (Mora Ordinaria)</p>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
                Bs {Number(carteraData?.summary?.totalCarteraMes3a6 || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-red-500/30 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">&gt; 6 Meses (Cartera Pesada)</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono mt-1">
                Bs {Number(carteraData?.summary?.totalCarteraMesMayor6 || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-white/10 font-black">
                  <tr>
                    <th className="p-4">Socio & Código Alfa</th>
                    <th className="p-4">Membresía / Categoría</th>
                    <th className="p-4 text-right">1-2 Meses (Bs)</th>
                    <th className="p-4 text-right">3-6 Meses (Bs)</th>
                    <th className="p-4 text-right">&gt; 6 Meses (Bs)</th>
                    <th className="p-4 text-right font-bold text-gray-900 dark:text-white">Mora Total Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-amber-700 dark:text-brand-gold font-bold animate-pulse">Calculando cartera saneada...</td></tr>
                  ) : carteraData?.rows?.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay deudas devengadas en mora registradas.</td></tr>
                  ) : (
                    carteraData?.rows?.map((r: any) => (
                      <tr key={r.personId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{r.fullName}</p>
                          <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-brand-gold bg-amber-50 dark:bg-black/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-brand-gold/30">
                            {r.alphaCode}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-800 dark:text-gray-200">{r.membershipNumber}</p>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{r.category}</span>
                        </td>
                        <td className="p-4 text-right text-amber-700 dark:text-amber-400 font-mono font-semibold">
                          {r.mora1a2Meses > 0 ? `Bs ${r.mora1a2Meses.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-4 text-right text-orange-700 dark:text-orange-400 font-mono font-semibold">
                          {r.mora3a6Meses > 0 ? `Bs ${r.mora3a6Meses.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-4 text-right text-red-600 dark:text-red-400 font-mono font-semibold">
                          {r.moraMas6Meses > 0 ? `Bs ${r.moraMas6Meses.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-gray-900 dark:text-white text-sm">
                          Bs {r.totalMoraRealDevengada.toFixed(2)}
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

      {/* TAB 2: RECAUDACIÓN MENSUAL */}
      {activeReportTab === 'RECAUDACION' && revenueData && (
        <div className="glass-panel p-6 space-y-6 bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl">
          <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
            Consolidado Mensual de Recaudación ({revenueData.year})
          </h3>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="monthName" stroke="#666" textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalFacturado" name="Facturado (Gravado)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalReciboCDP" name="Recibo Oficial CDP" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};
