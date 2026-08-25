import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Waves, 
  Dumbbell, 
  Clock, 
  Users, 
  Key, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  CalendarCheck, 
  Car, 
  Thermometer, 
  ChevronRight,
  TrendingDown,
  Info,
  Flame,
  Droplets
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface FacilityTelemetry {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: string;
  type: string;
  order?: number;
}

export const DEFAULT_PISCINA_FACILITIES: FacilityTelemetry[] = [
  { id: 'piscina_5_carriles', name: 'PISCINA 5 CARRILES', value: '30', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 1 },
  { id: 'piscina_3_carriles', name: 'PISCINA 3 CARRILES', value: '30', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 2 },
  { id: 'jacuzzi', name: 'JACUZZI', value: '41', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 3 },
  { id: 'sauna_v_hierbas', name: 'SAUNA V. HIERBAS', value: '36', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 4 },
  { id: 'sauna_seco', name: 'SAUNA SECO', value: 'Ok', unit: '', status: 'OPTIMO', type: 'STATUS', order: 5 },
  { id: 'sauna_eucalipto', name: 'SAUNA EUCALIPTO', value: '36', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 6 }
];

interface LiveOccupancyData {
  timestamp: string;
  currentHour: number;
  piscina: {
    inside: number;
    capacity: number;
    occupancyRate: number;
    todayTotal: number;
    totalLockers?: number;
    lockersInUse: number;
    lockersAvailable: number;
    waterTemp: number;
    piscina5Temp?: string;
    piscina3Temp?: string;
    totalLanes?: number;
    lastTempRecordedAt?: string | null;
    lanesAvailable: number;
    status: 'OPTIMO' | 'MODERADO' | 'CONCURRIDO';
    recommendation: string;
    facilities?: FacilityTelemetry[];
  };
  gimnasio: {
    inside: number;
    capacity: number;
    occupancyRate: number;
    todayTotal: number;
    totalLockers?: number;
    lockersInUse: number;
    lockersAvailable: number;
    status: 'OPTIMO' | 'MODERADO' | 'CONCURRIDO';
    recommendation: string;
  };
  gatehouse: {
    todayTotal: number;
    status: string;
  };
  hourlyCurve: Array<{
    hour: string;
    piscina: number;
    gimnasio: number;
    total: number;
  }>;
}

export const LiveClubOccupancy: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<LiveOccupancyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PISCINA' | 'GIMNASIO'>('ALL');
  const [countdown, setCountdown] = useState(15);

  const fetchLiveOccupancy = async () => {
    try {
      const res = await api.get('/access/live-occupancy');
      if (res.data?.success) {
        setData(res.data.data);
        setLastUpdated(new Date());
        setCountdown(15);
      }
    } catch (err: any) {
      console.error('Error fetching live occupancy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOccupancy();
    const interval = setInterval(fetchLiveOccupancy, 15000);
    const countTimer = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 15));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countTimer);
    };
  }, []);

  const getStatusColor = (status?: string) => {
    if (status === 'OPTIMO') return {
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      bar: 'bg-emerald-500',
      label: '🟢 Disponibilidad Óptima',
      border: 'border-emerald-500/30'
    };
    if (status === 'MODERADO') return {
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      bar: 'bg-amber-500',
      label: '🟡 Moderadamente Concurrido',
      border: 'border-amber-500/30'
    };
    return {
      badge: 'bg-red-500/20 text-red-400 border-red-500/40',
      bar: 'bg-red-500',
      label: '🔴 Afluencia Alta',
      border: 'border-red-500/30'
    };
  };

  const piscinaStatus = getStatusColor(data?.piscina?.status);
  const gimnasioStatus = getStatusColor(data?.gimnasio?.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070b09] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 relative overflow-hidden flex flex-col justify-between pb-12">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[350px] bg-brand-gold/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>

      {/* Top Header */}
      <header className="relative z-10 w-full p-4 lg:px-8 flex justify-between items-center border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3.5">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(user?.roles?.some(r => ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(r)) ? '/' : '/member');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-brand-gold hover:text-black dark:hover:bg-brand-gold dark:hover:text-black rounded-xl text-gray-700 dark:text-gray-300 transition-all text-xs font-bold"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <CrestLogo size="sm" />
          <div>
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-brand-gold">
              Club Hípico Los Sargentos
            </span>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Semáforo: Piscina y Gimnasio (En Vivo)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live pulse badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>EN VIVO ({countdown}s)</span>
          </div>

          <ThemeToggle />

          <button 
            onClick={fetchLiveOccupancy}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold text-gray-400 transition-colors"
            title="Actualizar ahora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-gold' : ''}`} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-6 flex-1">
        
        {/* HERO TITLE BANNER */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Planifica tu Asistencia al Club
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight serif-brand">
            ¿Cuan lleno está el Club ahora?
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Consulta el aforo en tiempo real de cada área, carriles libres y recomendaciones de horarios para disfrutar al máximo tus instalaciones.
          </p>
        </div>

        {/* 2 MAIN AREA LIVE CAPACITY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CARD 1: PISCINA */}
          <div className="relative bg-white dark:bg-[#09110d] rounded-3xl border-2 border-gray-200 dark:border-cyan-500/30 p-6 sm:p-7 shadow-xl shadow-cyan-500/5 hover:shadow-cyan-500/15 transition-all overflow-hidden flex flex-col justify-between group">
            
            {/* Background water glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-bl-[120px] pointer-events-none group-hover:scale-110 transition-transform"></div>

            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
                    <Waves className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                      ÁREA ACUÁTICA (5 Y 3 CARRILES)
                    </span>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                      Piscinas Climatizadas
                    </h3>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${piscinaStatus.badge}`}>
                  {piscinaStatus.label}
                </span>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aforo Actual
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      {data?.piscina.inside || 0}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">
                      / {data?.piscina.capacity || 50} socios ({data?.piscina.occupancyRate || 0}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-3.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${piscinaStatus.bar}`}
                    style={{ width: `${Math.max(data?.piscina.occupancyRate || 0, 5)}%` }}
                  ></div>
                </div>
              </div>

              {/* Real-time details grid: Centralized Piscina 5C, Piscina 3C and Casilleros */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 mb-5 text-center">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Piscina 5C</span>
                  <span className="text-xs sm:text-sm font-extrabold text-cyan-400 flex items-center justify-center gap-0.5 mt-0.5 font-mono">
                    <Thermometer className="w-3.5 h-3.5" /> 
                    {data?.piscina?.piscina5Temp || (data?.piscina?.facilities?.find(f => f.name.includes('5'))?.value) || '30'}°
                  </span>
                  <span className="text-[9px] text-emerald-400/80 block font-semibold">5 Carriles</span>
                </div>
                <div className="border-x border-gray-200 dark:border-white/5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Piscina 3C</span>
                  <span className="text-xs sm:text-sm font-extrabold text-cyan-400 flex items-center justify-center gap-0.5 mt-0.5 font-mono">
                    <Thermometer className="w-3.5 h-3.5" /> 
                    {data?.piscina?.piscina3Temp || (data?.piscina?.facilities?.find(f => f.name.includes('3'))?.value) || '30'}°
                  </span>
                  <span className="text-[9px] text-emerald-400/80 block font-semibold">3 Carriles</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Casilleros</span>
                  <span className="text-xs sm:text-sm font-extrabold text-brand-gold mt-0.5 block font-mono">
                    {data?.piscina.lockersAvailable !== undefined ? data.piscina.lockersAvailable : 57} libres
                  </span>
                  <span className="text-[9px] text-gray-400 block font-medium">
                    de {data?.piscina.totalLockers || 57}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{data?.piscina.recommendation}</span>
            </div>

          </div>

          {/* CARD 2: GIMNASIO */}
          <div className="relative bg-white dark:bg-[#09110d] rounded-3xl border-2 border-gray-200 dark:border-emerald-500/30 p-6 sm:p-7 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all overflow-hidden flex flex-col justify-between group">
            
            {/* Background fitness glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-bl-[120px] pointer-events-none group-hover:scale-110 transition-transform"></div>

            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                    <Dumbbell className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      ÁREA FITNESS
                    </span>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                      Gimnasio & Cardio
                    </h3>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${gimnasioStatus.badge}`}>
                  {gimnasioStatus.label}
                </span>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aforo Actual
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      {data?.gimnasio.inside || 0}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">
                      / {data?.gimnasio.capacity || 45} socios ({data?.gimnasio.occupancyRate || 0}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-3.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${gimnasioStatus.bar}`}
                    style={{ width: `${Math.max(data?.gimnasio.occupancyRate || 0, 5)}%` }}
                  ></div>
                </div>
              </div>

              {/* Real-time details grid */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 mb-5 text-center">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Cardio</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-400 block mt-0.5">
                    Libre
                  </span>
                </div>
                <div className="border-x border-gray-200 dark:border-white/5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Musculación</span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white mt-0.5 block">
                    Óptimo
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Lockers</span>
                  <span className="text-xs sm:text-sm font-extrabold text-brand-gold mt-0.5 block">
                    {data?.gimnasio.lockersAvailable !== undefined ? data.gimnasio.lockersAvailable : 25} libres
                  </span>
                  <span className="text-[9px] text-gray-400 block font-medium">
                    de {data?.gimnasio.totalLockers || 40}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{data?.gimnasio.recommendation}</span>
            </div>

          </div>

        </div>

        {/* TABLERO DIGITAL DE ÁREA HÚMEDA & SAUNAS EN VIVO CON EFECTO AGUA */}
        <div className="bg-gradient-to-br from-[#041912] via-[#082218] to-[#03130d] p-6 sm:p-7 rounded-3xl border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 space-y-5 relative overflow-hidden group">
          
          {/* PURE CODE DYNAMIC WATER BACKGROUND & CAUSTIC WAVE ANIMATION */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
            {/* Caustic water shimmer glow */}
            <div className="absolute -inset-10 water-caustic-effect blur-2xl pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-700"></div>

            {/* Subtle animated water ripple circles */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl animate-pulse pointer-events-none"></div>

            {/* Animated SVG Wave Layer 1 */}
            <svg 
              className="absolute -bottom-2 left-0 w-[200%] h-36 text-cyan-500/10 dark:text-cyan-400/10 water-wave-anim-1 pointer-events-none" 
              viewBox="0 0 1200 120" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0,20 C150,80 350,-20 500,50 C650,120 900,15 1200,35 L1200,120 L0,120 Z" 
                fill="currentColor"
              ></path>
            </svg>

            {/* Animated SVG Wave Layer 2 */}
            <svg 
              className="absolute -bottom-1 left-0 w-[200%] h-28 text-emerald-500/15 dark:text-emerald-400/10 water-wave-anim-2 pointer-events-none" 
              viewBox="0 0 1200 120" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0,45 C200,110 450,10 650,65 C850,120 1050,35 1200,70 L1200,120 L0,120 Z" 
                fill="currentColor"
              ></path>
            </svg>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/15 backdrop-blur-md">
                <Waves className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Tablero Digital En Vivo
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> Monitoreo y calderas
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  Temperaturas de Piscinas & Saunas
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-300 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-emerald-400">Instalaciones Climatizadas Activas</span>
            </div>
          </div>

          {/* Telemetry Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
            {((data?.piscina?.facilities && data.piscina.facilities.length > 0) ? data.piscina.facilities : DEFAULT_PISCINA_FACILITIES).map((facility) => {
              const isSauna = facility.name.toLowerCase().includes('sauna');
              const isJacuzzi = facility.name.toLowerCase().includes('jacuzzi');
              
              // Theme color tokens matching CHLS luxury palette
              const themeStyles = isJacuzzi
                ? {
                    cardBorder: 'border-blue-500/30 hover:border-blue-400/60',
                    iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
                    titleColor: 'text-white group-hover/item:text-blue-300',
                    subColor: 'text-blue-400/80',
                    pillBg: 'bg-blue-500/15 border-blue-400/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  }
                : isSauna
                ? {
                    cardBorder: 'border-amber-500/30 hover:border-amber-400/60',
                    iconBg: 'bg-amber-500/15 text-brand-gold border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
                    titleColor: 'text-white group-hover/item:text-brand-gold',
                    subColor: 'text-amber-400/80',
                    pillBg: 'bg-amber-500/15 border-brand-gold/40 text-brand-gold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  }
                : {
                    cardBorder: 'border-cyan-500/30 hover:border-cyan-400/60',
                    iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
                    titleColor: 'text-white group-hover/item:text-cyan-300',
                    subColor: 'text-cyan-400/80',
                    pillBg: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  };

              return (
                <div 
                  key={facility.id}
                  className={`bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl border-2 ${themeStyles.cardBorder} p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-lg group/item`}
                >
                  {/* Left: Icon & Facility Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${themeStyles.iconBg}`}>
                      {isJacuzzi ? <Sparkles className="w-5 h-5" /> : isSauna ? <Flame className="w-5 h-5" /> : <Waves className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${themeStyles.titleColor} transition-colors leading-tight`}>
                        {facility.name}
                      </h4>
                      <span className={`text-[10px] font-semibold block mt-0.5 ${themeStyles.subColor}`}>
                        {isSauna ? 'Área Spa & Relajación' : (isJacuzzi ? 'Hidromasaje Térmico' : 'Carriles Climatizados')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Glassmorphic Illuminated Badge */}
                  <div className={`px-3.5 py-1.5 rounded-2xl border-2 ${themeStyles.pillBg} backdrop-blur-md flex items-center justify-center shrink-0 min-w-[70px]`}>
                    <span className="text-xl sm:text-2xl font-black tracking-tight font-mono">
                      {facility.value}{facility.unit || ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Info Tip */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300 relative z-10 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0" />
              Las temperaturas se mantienen dentro de los rangos óptimos regulados por el departamento de deportes y mantenimiento del Club.
            </span>
          </div>

        </div>

        {/* CASETA PRINCIPAL STATUS */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-white/10 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-gray-900 dark:text-white">
                Portería & Caseta Principal
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Acceso vehicular y peatonal fluido &bull; Total ingresos hoy: {data?.gatehouse.todayTotal || 0} personas</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            🟢 Tráfico Fluido
          </span>
        </div>

        {/* HOURLY RECOMMENDED VISITING CURVE */}
        <div className="bg-white dark:bg-[#0a120e] p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-gold" />
                Curva de Afluencia de Hoy (Horarios Sugeridos)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                La barra resaltada en dorado indica la hora actual. Las horas con barras más bajas son ideales para venir con tranquilidad.
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Piscina
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Gimnasio
              </span>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hourlyCurve || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c1410', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="piscina" name="Piscina" fill="#06b6d4" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="gimnasio" name="Gimnasio" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full p-6 text-center text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-sm mt-8">
        <span>Datos actualizados automáticamente cada 15 segundos &bull; Club Hípico Los Sargentos</span>
      </footer>

    </div>
  );
};
