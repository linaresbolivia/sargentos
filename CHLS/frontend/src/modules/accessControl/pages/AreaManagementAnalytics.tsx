import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Users, 
  Key, 
  Layers, 
  RefreshCw, 
  Waves, 
  Dumbbell, 
  Copy, 
  Calendar, 
  TrendingUp,
  Award,
  Sparkles,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import CrestLogo from '@shared/components/CrestLogo';

const COLORS = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  gold: '#cca14b',
  goldDark: '#a16207',
  blue: '#3b82f6',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  amber: '#f59e0b'
};

const PIE_COLORS = [COLORS.gold, COLORS.cyan, COLORS.emerald, COLORS.purple, COLORS.pink, COLORS.blue, COLORS.amber];

const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent === 0 || percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const AreaManagementAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Filters
  const [areaFilter, setAreaFilter] = useState<'ALL' | 'PISCINA' | 'GIMNASIO'>('ALL');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Analytics Data
  const [analyticsData, setAnalyticsData] = useState<any>({
    totalVisits: 0,
    piscinaCount: 0,
    gimnasioCount: 0,
    maleCount: 0,
    femaleCount: 0,
    lockersCount: 0,
    towelsCount: 0,
    towelSizes: { grande: 0, pequena: 0, ambas: 0 },
    avgStayMinutes: 0,
    dependencyDistribution: [],
    hourlyDistribution: [],
    dayOfWeekCounts: [],
    dailyTrend: [],
    topVisitors: []
  });

  // Chart Refs for copy to clipboard
  const hourlyChartRef = useRef<HTMLDivElement>(null);
  const dailyChartRef = useRef<HTMLDivElement>(null);
  const daysOfWeekChartRef = useRef<HTMLDivElement>(null);
  const dependencyChartRef = useRef<HTMLDivElement>(null);

  const copyChartAsImage = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    try {
      const toastId = toast.loading(`Copiando gráfico ${name}...`);
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#0a100d',
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
      toast.error('Error al generar la imagen del gráfico');
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/access/executive-analytics', {
        params: {
          area: areaFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error loading executive analytics:', err);
      toast.error('Error al cargar analítica de gerencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [areaFilter, startDate, endDate]);

  // Quick preset ranges
  const handleQuickPreset = (type: 'TODAY' | '7_DAYS' | 'THIS_MONTH' | '3_MONTHS' | 'THIS_YEAR') => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (type === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === '7_DAYS') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (type === 'THIS_MONTH') {
      setStartDate(format(today, 'yyyy-MM-01'));
      setEndDate(todayStr);
    } else if (type === '3_MONTHS') {
      setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (type === 'THIS_YEAR') {
      setStartDate(format(today, 'yyyy-01-01'));
      setEndDate(todayStr);
    }
  };

  const avgStayFormatted = useMemo(() => {
    const mins = analyticsData.avgStayMinutes || 0;
    if (mins === 0) return '-';
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }, [analyticsData.avgStayMinutes]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060a08] relative overflow-hidden font-sans flex flex-col p-4 sm:p-6 lg:p-10 text-gray-900 dark:text-white transition-colors">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-brand-gold/15 rounded-full blur-[140px] pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-6">
        
        {/* TOP HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-200 dark:border-brand-gold/20 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/access-selection')}
              className="p-2.5 bg-white dark:bg-[#0c1410] hover:bg-gray-100 dark:hover:bg-black/60 border border-gray-200 dark:border-brand-gold/30 rounded-2xl text-brand-gold shadow-md transition-all hover:scale-105 active:scale-95"
              title="Volver"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <BarChart3 className="text-brand-gold w-8 h-8" />
                  Dashboard Ejecutivo de Gerencia
                </h1>
                <span className="px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold font-bold text-xs border border-brand-gold/30 uppercase tracking-wider">
                  Analítica de Concurrencia
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Comportamiento de socios, horarios pico, índice de permanencia y uso de insumos del club.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/access/reports')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-gold/15 hover:bg-brand-gold hover:text-black text-brand-gold font-bold text-xs uppercase tracking-wider border border-brand-gold/30 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Generador de Reportes (PDF/Excel)
            </button>

            <button 
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2.5 bg-white dark:bg-black/40 hover:bg-gray-100 dark:hover:bg-black/60 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-600 dark:text-gray-300 transition-all shadow-sm"
              title="Refrescar datos"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-brand-gold' : ''} />
            </button>
          </div>
        </div>

        {/* FILTERS PANEL */}
        <div className="bg-white dark:bg-[#0a120e] p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Área:</span>
              <div className="flex bg-black/5 dark:bg-black/40 rounded-xl p-1 border border-gray-200 dark:border-white/5">
                <button
                  onClick={() => setAreaFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    areaFilter === 'ALL' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🌐 Todas las Áreas
                </button>
                <button
                  onClick={() => setAreaFilter('PISCINA')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    areaFilter === 'PISCINA' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" /> Piscina
                </button>
                <button
                  onClick={() => setAreaFilter('GIMNASIO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    areaFilter === 'GIMNASIO' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" /> Gimnasio
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">Periodo:</span>
              <button 
                onClick={() => handleQuickPreset('TODAY')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Hoy
              </button>
              <button 
                onClick={() => handleQuickPreset('7_DAYS')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                7 Días
              </button>
              <button 
                onClick={() => handleQuickPreset('THIS_MONTH')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Este Mes
              </button>
              <button 
                onClick={() => handleQuickPreset('3_MONTHS')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Últimos 3 Meses
              </button>
              <button 
                onClick={() => handleQuickPreset('THIS_YEAR')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Año {new Date().getFullYear()}
              </button>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-gray-400 uppercase">Desde:</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-gray-400 uppercase">Hasta:</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>
        </div>

        {/* 6 EXECUTIVE METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Concurrencias</span>
              <TrendingUp className="w-4 h-4 text-brand-gold" />
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{analyticsData.totalVisits}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Visitas en el periodo</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Piscina vs Gimnasio</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
              <span className="text-cyan-400">{analyticsData.piscinaCount}</span>
              <span className="text-gray-400">/</span>
              <span className="text-emerald-400">{analyticsData.gimnasioCount}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {Math.round((analyticsData.piscinaCount / (analyticsData.totalVisits || 1)) * 100)}% Piscina • {Math.round((analyticsData.gimnasioCount / (analyticsData.totalVisits || 1)) * 100)}% Gimnasio
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Tiempo Promedio</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{avgStayFormatted}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Por permanencia de socio</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Lockers Utilizados</span>
              <Key className="w-4 h-4 text-brand-gold" />
            </div>
            <div className="text-2xl font-black text-brand-gold">{analyticsData.lockersCount}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {Math.round((analyticsData.lockersCount / (analyticsData.totalVisits || 1)) * 100)}% de concurrentes
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Toallas Prestadas</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400">{analyticsData.towelsCount}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              G: {analyticsData.towelSizes?.grande || 0} • P: {analyticsData.towelSizes?.pequena || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Varones / Mujeres</span>
              <Users className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-cyan-400">{analyticsData.maleCount}👨</span>
              <span className="text-gray-400">/</span>
              <span className="text-pink-400">{analyticsData.femaleCount}👩</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {Math.round((analyticsData.maleCount / (analyticsData.totalVisits || 1)) * 100)}% Hombres
            </div>
          </div>

        </div>

        {/* SECTION 1: HOURLY CURVE & DAILY TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Curva de Afluencia por Horario (Horas Pico) */}
          <div ref={hourlyChartRef} className="bg-white dark:bg-[#0a120e] p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl relative group">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-gold" />
                  Horarios Pico de Afluencia (06:00 - 22:00)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Distribución promedio de ingresos por hora del día</p>
              </div>
              <button 
                onClick={() => copyChartAsImage(hourlyChartRef, 'Horarios Pico')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-brand-gold"
                title="Copiar Gráfico"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.hourlyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPiscina" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGimnasio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="#888" fontSize={10} />
                  <YAxis stroke="#888" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c1410', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="piscina" name="Piscina" stroke={COLORS.cyan} fillOpacity={1} fill="url(#colorPiscina)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="gimnasio" name="Gimnasio" stroke={COLORS.emerald} fillOpacity={1} fill="url(#colorGimnasio)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Evolución Diaria de Visitas */}
          <div ref={dailyChartRef} className="bg-white dark:bg-[#0a120e] p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl relative group">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-gold" />
                  Evolución Diaria de Concurrencias
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total de socios atendidos por día</p>
              </div>
              <button 
                onClick={() => copyChartAsImage(dailyChartRef, 'Evolución Diaria')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-brand-gold"
                title="Copiar Gráfico"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#888" fontSize={9} tickFormatter={(str) => str.slice(5)} />
                  <YAxis stroke="#888" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c1410', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="piscina" name="Piscina" fill={COLORS.cyan} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="gimnasio" name="Gimnasio" fill={COLORS.emerald} radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* SECTION 2: DAYS OF WEEK & DEPENDENCY PIE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 3: Distribución por Día de la Semana */}
          <div ref={daysOfWeekChartRef} className="bg-white dark:bg-[#0a120e] p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl relative group">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-gold" />
                  Afluencia por Día de la Semana
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Comparativa de concurrencia de Lunes a Domingo</p>
              </div>
              <button 
                onClick={() => copyChartAsImage(daysOfWeekChartRef, 'Días de la Semana')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-brand-gold"
                title="Copiar Gráfico"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.dayOfWeekCounts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#888" fontSize={10} />
                  <YAxis stroke="#888" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c1410', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="piscina" name="Piscina" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gimnasio" name="Gimnasio" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Composición por Dependencias */}
          <div ref={dependencyChartRef} className="bg-white dark:bg-[#0a120e] p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl relative group flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-gold" />
                  Composición por Dependencia
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Titulares vs Esposa vs Hijos vs Invitados</p>
              </div>
              <button 
                onClick={() => copyChartAsImage(dependencyChartRef, 'Composición por Dependencia')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-brand-gold"
                title="Copiar Gráfico"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="h-64 sm:h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.dependencyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedPieLabel}
                    outerRadius={90}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.dependencyDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c1410', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(value: any, name: any) => [`${value} ingresos`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* SECTION 3: TOP 10 FREQUENT SOCIOS TABLE */}
        <div className="bg-white dark:bg-[#0a120e] rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl overflow-hidden">
          
          <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-black/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                  Ranking de Socios Más Frecuentes
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Socios con mayor concurrencia y tiempo de estancia en el periodo</p>
              </div>
            </div>

            <span className="text-xs text-brand-gold font-bold px-3 py-1 rounded-full bg-brand-gold/15 border border-brand-gold/30">
              Top 10 Concurrencias
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 uppercase text-[9px] tracking-wider bg-gray-100/50 dark:bg-black/40">
                  <th className="py-3.5 px-4 font-bold">Posición</th>
                  <th className="py-3.5 px-4 font-bold">Nombre del Socio</th>
                  <th className="py-3.5 px-4 font-bold">Cód. Socio</th>
                  <th className="py-3.5 px-4 font-bold">Dependencia</th>
                  <th className="py-3.5 px-4 font-bold text-center">Total Visitas</th>
                  <th className="py-3.5 px-4 font-bold text-center">Tiempo Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {analyticsData.topVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No hay datos suficientes para el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  analyticsData.topVisitors.map((visitor: any, index: number) => {
                    const avgMins = visitor.avgMins || 0;
                    const avgFormatted = avgMins > 0 ? `${Math.floor(avgMins / 60)}h ${avgMins % 60}m` : '-';

                    return (
                      <tr key={index} className="hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors">
                        
                        <td className="py-3.5 px-4">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                            index === 0 ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30' :
                            index === 1 ? 'bg-slate-300 text-black' :
                            index === 2 ? 'bg-amber-700 text-white' :
                            'bg-black/10 dark:bg-white/10 text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                          {visitor.name}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-brand-gold font-semibold">
                          {visitor.memberCode ? `#${visitor.memberCode}` : '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            {visitor.dependency}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 font-extrabold text-xs border border-emerald-500/30">
                            {visitor.visits} visitas
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-purple-400 font-bold">
                          {avgFormatted}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};
