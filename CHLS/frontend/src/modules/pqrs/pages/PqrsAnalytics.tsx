import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { ArrowLeft, Activity, CheckCircle2, Clock, Inbox, AlertTriangle, Users, MapPin, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import logoClub from '../../../assets/logo.png';

interface PqrsTicket {
  id: string;
  type: string;
  area: string;
  status: string;
  createdAt: string;
  fullName: string;
  memberCode?: string;
}

const COLORS = {
  emerald: '#10b981',
  emeraldDark: '#047857',
  gold: '#eab308',
  goldDark: '#a16207',
  blue: '#3b82f6',
  red: '#ef4444',
  purple: '#8b5cf6'
};

const PIE_COLORS = [COLORS.emerald, COLORS.gold, COLORS.blue, COLORS.purple];

const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const PqrsAnalytics: React.FC = () => {
  const [tickets, setTickets] = useState<PqrsTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const navigate = useNavigate();

  // Chart Refs for copy to clipboard
  const trendChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const areaChartRef = useRef<HTMLDivElement>(null);

  const copyChartAsImage = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    try {
      const toastId = toast.loading(`Copiando ${name}...`);
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#ffffff', // White background
        scale: 2, // Higher quality
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success(`${name} copiado al portapapeles`, { id: toastId });
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

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/pqrs');
        setTickets(response.data.tickets || []);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos para el reporte.');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const tDate = new Date(t.createdAt);
      if (startDate) {
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const startD = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        if (startD > tDate) return false;
      }
      if (endDate) {
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        const endD = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        if (endD < tDate) return false;
      }
      return true;
    });
  }, [tickets, startDate, endDate]);

  // --- Data Aggregations ---

  // 1. KPIs
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter(t => t.status === 'ABIERTO').length;
  const inProgressTickets = filteredTickets.filter(t => t.status === 'EN_PROGRESO').length;
  const closedTickets = filteredTickets.filter(t => t.status === 'CERRADO').length;

  const resolutionRate = totalTickets > 0 ? ((closedTickets / totalTickets) * 100).toFixed(1) : '0.0';

  // 2. Trend (Based on filtered data)
  const trendData = useMemo(() => {
    // If no filter, default to 30 days for trend
    let dataToUse = filteredTickets;
    if (!startDate && !endDate) {
      const thirtyDaysAgo = subDays(new Date(), 30);
      dataToUse = filteredTickets.filter(t => isAfter(parseISO(t.createdAt), thirtyDaysAgo));
    }
    
    const grouped = dataToUse.reduce((acc: any, ticket) => {
      const date = format(parseISO(ticket.createdAt), 'dd MMM', { locale: es });
      if (!acc[date]) acc[date] = { date, total: 0, resueltos: 0 };
      acc[date].total += 1;
      if (ticket.status === 'CERRADO') acc[date].resueltos += 1;
      return acc;
    }, {});
    
    // Sort by actual date to ensure correct order
    return Object.values(grouped).sort((a: any, b: any) => {
       const dateA = new Date(dataToUse.find(t => format(parseISO(t.createdAt), 'dd MMM', { locale: es }) === a.date)?.createdAt || 0);
       const dateB = new Date(dataToUse.find(t => format(parseISO(t.createdAt), 'dd MMM', { locale: es }) === b.date)?.createdAt || 0);
       return dateA.getTime() - dateB.getTime();
    });
  }, [filteredTickets, startDate, endDate]);

  // 3. Distribution by Type
  const typeData = useMemo(() => {
    const counts = filteredTickets.reduce((acc: any, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredTickets]);

  // 4. Distribution by Area
  const areaData = useMemo(() => {
    const counts = filteredTickets.reduce((acc: any, t) => {
      const areaName = t.area || 'Sin Área';
      acc[areaName] = (acc[areaName] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts)
      .map(key => ({ area: key, Casos: counts[key] }))
      .sort((a, b) => b.Casos - a.Casos);
  }, [filteredTickets]);

  const topArea = areaData.length > 0 ? areaData[0] : null;

  // 5. Top Members
  const topMembers = useMemo(() => {
    const counts = filteredTickets.reduce((acc: any, t) => {
      const name = t.memberCode ? `${t.fullName} (${t.memberCode})` : t.fullName;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.keys(counts)
      .map(key => ({ name: key, count: counts[key] }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 3);
  }, [filteredTickets]);

  // Custom Glass Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-md border border-brand-green/30 p-4 rounded-xl shadow-2xl">
          <p className="text-gray-900 dark:text-white font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f16] relative overflow-hidden font-sans flex flex-col p-6 lg:p-8 text-gray-900 dark:text-white">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-40 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/20 via-transparent dark:via-[#0a0f16] to-transparent dark:to-[#0a0f16]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-1/3 -left-20 w-72 h-72 bg-brand-green/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-green/20 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin/pqrs')}
              className="p-2 bg-white dark:bg-black/40 hover:bg-gray-100 dark:hover:bg-black/60 border border-gray-200 dark:border-brand-green/30 rounded-xl text-brand-gold shadow-sm transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-brand-gold flex items-center gap-3 drop-shadow-sm">
                <img src={logoClub} alt="Club Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                Reporte Gerencial PQRS
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 tracking-wide uppercase font-medium">Panel de Analíticas y KPIs</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-black/40 p-2 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-sm outline-none text-gray-700 dark:text-gray-300 dark:[color-scheme:dark]"
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-sm outline-none text-gray-700 dark:text-gray-300 dark:[color-scheme:dark]"
              />
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-bold flex items-center gap-2">
              <Activity size={16} className="animate-pulse" /> Datos Actualizados
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-brand-gold/30 shadow-sm dark:shadow-[0_4px_20px_rgba(234,179,8,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 dark:from-brand-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">Total Casos</p>
                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400">{totalTickets}</h3>
                  </div>
                  <div className="p-3 bg-brand-gold/20 rounded-lg"><Inbox className="text-brand-gold" size={24} /></div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-red-500/30 shadow-sm dark:shadow-[0_4px_20px_rgba(239,68,68,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 dark:from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">Abiertos / Pendientes</p>
                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400">{openTickets}</h3>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-lg"><AlertTriangle className="text-red-500" size={24} /></div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-emerald-500/30 shadow-sm dark:shadow-[0_4px_20px_rgba(16,185,129,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 dark:from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">Tasa de Resolución</p>
                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400">{resolutionRate}%</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/20 rounded-lg"><CheckCircle2 className="text-emerald-500" size={24} /></div>
                </div>
              </div>

              {/* NEW KPIS */}
              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-blue-500/30 shadow-sm dark:shadow-[0_4px_20px_rgba(59,130,246,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 dark:from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex flex-col relative z-10 w-full">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-semibold">Top Socios con más PQRS</p>
                    <Users className="text-blue-500" size={18} />
                  </div>
                  
                  {topMembers.length > 0 ? (
                    <div className="space-y-2">
                      {topMembers.map((m, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2 last:border-0 last:pb-0">
                          <span className="text-gray-800 dark:text-white text-sm font-semibold truncate max-w-[150px]" title={m.name}>{m.name}</span>
                          <span className="text-blue-500 text-xs bg-blue-500/10 px-2 py-1 rounded-full font-bold">{m.count} {m.count === 1 ? 'caso' : 'casos'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold text-gray-500">N/A</h3>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-purple-500/30 shadow-sm dark:shadow-[0_4px_20px_rgba(139,92,246,0.1)] relative overflow-hidden group lg:col-span-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 dark:from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">Área Más Afectada</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{topArea?.area || 'N/A'}</h3>
                    <p className="text-sm text-purple-500 font-medium">{topArea?.Casos || 0} quejas/reclamos/etc.</p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg"><MapPin className="text-purple-500" size={24} /></div>
                </div>
              </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trend Chart (Takes up 2 columns) */}
              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-2xl lg:col-span-2 relative">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Activity size={20} className="text-brand-gold"/> Tendencia de Casos</h3>
                  <button onClick={() => copyChartAsImage(trendChartRef, 'Tendencia de Casos')} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors" title="Copiar gráfico con fondo blanco">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="h-[350px] w-full" ref={trendChartRef} style={{ padding: '10px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorResueltos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle"/>
                      <Area type="monotone" dataKey="total" name="Total Recibidos" stroke={COLORS.gold} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                      <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke={COLORS.emerald} strokeWidth={3} fillOpacity={1} fill="url(#colorResueltos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-2xl relative">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Distribución por Tipo</h3>
                  <button onClick={() => copyChartAsImage(pieChartRef, 'Distribución por Tipo')} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors" title="Copiar gráfico con fondo blanco">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="h-[350px] w-full flex justify-center items-center" ref={pieChartRef} style={{ padding: '10px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                        label={renderCustomizedPieLabel}
                      >
                        {typeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart - By Area */}
              <div className="bg-white dark:bg-[#131c26]/80 dark:backdrop-blur-xl p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-2xl lg:col-span-3 relative">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Casos por Área (Top 7)</h3>
                  <button onClick={() => copyChartAsImage(areaChartRef, 'Casos por Área')} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors" title="Copiar gráfico con fondo blanco">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="h-[350px] w-full" ref={areaChartRef} style={{ padding: '10px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaData.slice(0, 7)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="area" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                      <Bar dataKey="Casos" fill={COLORS.emerald} radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#9ca3af', fontSize: 12, fontWeight: 'bold' }}>
                        {areaData.slice(0, 7).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS.emerald : COLORS.gold} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PqrsAnalytics;
