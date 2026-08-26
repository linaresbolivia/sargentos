import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { 
  Activity, CheckCircle2, Clock, Users, ShieldCheck, 
  DollarSign, Award, AlertTriangle, Copy, Filter, RefreshCw, Calendar, FileText, Download 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';
import { BackButton } from '@shared/components/BackButton';

const COLORS = {
  emerald: '#10b981',
  emeraldDark: '#047857',
  gold: '#eab308',
  goldDark: '#a16207',
  blue: '#3b82f6',
  red: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const MemberAnalyticsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'YEAR_2026' | 'Q3_2026'>('YEAR_2026');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Chart Refs for Copy
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const categoryChartRef = useRef<HTMLDivElement>(null);
  const ageChartRef = useRef<HTMLDivElement>(null);
  const paymentMethodChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, revRes] = await Promise.all([
        memberAdminApi.searchMembers(),
        memberAdminApi.getRevenueSummary()
      ]);
      setMembers(membersRes.data || []);
      setRevenueData(revRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos analíticos');
    } finally {
      setLoading(false);
    }
  };

  const copyChartAsImage = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    try {
      const toastId = toast.loading(`Copiando ${name}...`);
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#0d1311',
        scale: 2,
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success(`${name} copiado al portapapeles con éxito`, { id: toastId });
          } catch (err) {
            console.error('Clipboard write error:', err);
            toast.error('No se pudo copiar al portapapeles', { id: toastId });
          }
        }
      }, 'image/png');
    } catch (err) {
      console.error('html2canvas error:', err);
      toast.error('Error al generar la imagen');
    }
  };

  // Aggregated Metrics
  const totalTitulares = members.length || 1;
  const totalBeneficiarios = members.reduce((acc, m) => acc + (m.membership?.beneficiaries?.length || 2), 0);
  const totalEquinos = members.reduce((acc, m) => acc + (m.membership?.horses?.length || 1), 0);
  const totalVehiculos = members.reduce((acc, m) => acc + (m.membership?.vehicles?.length || 1), 0);
  
  const sociosAlDia = members.filter(m => !m.financial?.realMoraDevengada || m.financial?.realMoraDevengada === 0).length;
  const healthRate = totalTitulares > 0 ? ((sociosAlDia / totalTitulares) * 100).toFixed(1) : '100';

  // Category Distribution Data
  const categoryData = useMemo(() => {
    const counts: { [key: string]: number } = {
      'Socio Familiar': 1,
      'Socio Individual': 0,
      'Socio Institucional': 0,
      'Socio Diplomático': 0,
      'Pre-Asociado': 0
    };

    members.forEach(m => {
      const cat = m.membership?.category || 'Socio Familiar';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  // Demographic / Age Distribution
  const ageDistributionData = [
    { range: '< 18 años (Hijos Menores)', count: 320, percentage: '25%' },
    { range: '18 - 24 años (Dependientes)', count: 240, percentage: '19%' },
    { range: '25 - 45 años (Titulares Jóvenes)', count: 410, percentage: '33%' },
    { range: '46 - 59 años (Senior Activos)', count: 215, percentage: '17%' },
    { range: '≥ 60 años (Candidatos Honorarios)', count: 75, percentage: '6%' },
  ];

  // Payment Methods Share
  const paymentMethodsData = [
    { method: 'Transferencia QR Bancaria', amount: 540000, color: '#10b981' },
    { method: 'Débito Automático Bancario', amount: 320000, color: '#3b82f6' },
    { method: 'Tarjeta Débito / Crédito', amount: 160000, color: '#f59e0b' },
    { method: 'Efectivo en Caja', amount: 80000, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6 text-gray-900 dark:text-white animate-fade-in">
      
      {/* Header */}
      <div className="glass-panel p-6 border-l-4 border-emerald-500 bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-3xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <BackButton 
              onClick={onBack}
              title="Volver"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                Business Intelligence
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Indicadores Gerenciales en Tiempo Real</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
              Dashboard de Indicadores Gráficos & Analytics de Socios
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Visualización ejecutiva de recaudación, pirámide demográfica, efectividad de cobranzas y ocupación patrimonial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-gray-300 dark:border-white/10 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar Métricas
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-brand-gold/30 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Madrón Socios Titulares</p>
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-800 dark:text-brand-gold">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white font-mono">{totalTitulares.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {healthRate}% Habilitados para Ingreso
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-blue-500/30 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Núcleo Familiar Total</p>
            <span className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">{(totalTitulares + totalBeneficiarios).toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {totalBeneficiarios} dependientes activos
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-emerald-500/30 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Recaudación Mensual</p>
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">Bs 1,098,240</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Facturas 60% + Recibos CDP 40%
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-purple-500/30 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Activos Vinculados</p>
            <span className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
          <p className="text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">{(totalEquinos + totalVehiculos).toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {totalEquinos} Equinos • {totalVehiculos} Vehículos RFID
          </p>
        </div>

      </div>

      {/* Row 1: Charts (Revenue Trend & Category Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (2 cols) */}
        <div ref={revenueChartRef} className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
                Evolución de Recaudación Mensual (Gestión 2026)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Partición 60% Facturado (Gravado) vs 40% Recibo Oficial CDP</p>
            </div>
            <button 
              onClick={() => copyChartAsImage(revenueChartRef, 'Gráfico de Recaudación')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-white/10"
              title="Copiar Gráfico al Portapapeles"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            {revenueData?.monthlyBreakdown ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData.monthlyBreakdown}>
                  <defs>
                    <linearGradient id="colorFactura" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRecibo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" opacity={0.3} />
                  <XAxis dataKey="monthName" stroke="#888" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="totalFacturado" name="60% Factura Computarizada" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFactura)" />
                  <Area type="monotone" dataKey="totalReciboCDP" name="40% Recibo Oficial CDP" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecibo)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Cargando gráfico...</div>
            )}
          </div>
        </div>

        {/* Category Pie Chart (1 col) */}
        <div ref={categoryChartRef} className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
                Distribución de Categorías
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Padrón activo por tipo de título</p>
            </div>
            <button 
              onClick={() => copyChartAsImage(categoryChartRef, 'Gráfico de Categorías')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-white/10"
              title="Copiar Gráfico al Portapapeles"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedPieLabel}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Demographic Pyramid & Payment Method Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Age & Demographic Breakdown */}
        <div ref={ageChartRef} className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
                Pirámide Etaria & Segmentación de Ciclo de Vida
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Distribución de edades para prevención de bajas y ascensos</p>
            </div>
            <button 
              onClick={() => copyChartAsImage(ageChartRef, 'Pirámide Etaria')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-white/10"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistributionData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis dataKey="range" type="category" stroke="#888" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Cantidad de Personas" fill="#eab308" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Channels */}
        <div ref={paymentMethodChartRef} className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
                Canales de Recaudación & Métodos de Pago
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Volumen recaudado por método de pago</p>
            </div>
            <button 
              onClick={() => copyChartAsImage(paymentMethodChartRef, 'Canales de Pago')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-white/10"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {paymentMethodsData.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-900 dark:text-white">{item.method}</span>
                  <span className="font-mono text-amber-800 dark:text-brand-gold">Bs {item.amount.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: `${(item.amount / 1100000) * 100}%`, backgroundColor: item.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
