import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { 
  ShieldCheck, 
  Waves, 
  Dumbbell, 
  Clock, 
  Users, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  Activity,
  Layers,
  FileText,
  BarChart3
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { api } from '@config/api';

interface AreaSummary {
  piscinaInside: number;
  piscinaToday: number;
  gimnasioInside: number;
  gimnasioToday: number;
}

export const AccessPointSelection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [summary, setSummary] = useState<AreaSummary>({
    piscinaInside: 0,
    piscinaToday: 0,
    gimnasioInside: 0,
    gimnasioToday: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchSummaries();
    const interval = setInterval(fetchSummaries, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchSummaries = async () => {
    try {
      const [resPiscina, resGimnasio] = await Promise.all([
        api.get('/access/area-stats?area=PISCINA').catch(() => ({ data: { data: { currentlyInside: 0, totalToday: 0 } } })),
        api.get('/access/area-stats?area=GIMNASIO').catch(() => ({ data: { data: { currentlyInside: 0, totalToday: 0 } } }))
      ]);

      setSummary({
        piscinaInside: resPiscina.data?.data?.currentlyInside || 0,
        piscinaToday: resPiscina.data?.data?.totalToday || 0,
        gimnasioInside: resGimnasio.data?.data?.currentlyInside || 0,
        gimnasioToday: resGimnasio.data?.data?.totalToday || 0
      });
    } catch (err) {
      console.error('Error fetching area stats:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070b09] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 relative overflow-hidden flex flex-col justify-between">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-brand-gold/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] dark:opacity-[0.07] pointer-events-none"></div>

      {/* Top Header */}
      <header className="relative z-10 w-full p-6 lg:px-12 flex justify-between items-center border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <BackButton to="/" title="Volver al Portal Principal" />
          <CrestLogo size="sm" />
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-brand-gold">Club Hípico Los Sargentos</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white serif-brand tracking-wide">
              Puntos de Control de Acceso
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 font-medium">
            <Clock className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
            <span>{currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            <span className="text-brand-gold font-bold">{currentTime.toLocaleTimeString('es-ES')}</span>
          </div>

          <ThemeToggle />

          <button 
            onClick={() => navigate('/access/analytics')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-gold/15 hover:bg-brand-gold hover:text-black text-brand-gold font-bold text-xs uppercase tracking-wider border border-brand-gold/30 transition-all shadow-sm"
            title="Dashboard Ejecutivo de Gerencia"
          >
            <BarChart3 className="w-4 h-4" />
            Analítica Gerencial
          </button>

          <button 
            onClick={() => navigate('/access/reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-brand-gold hover:text-black dark:hover:bg-brand-gold dark:hover:text-black text-gray-700 dark:text-gray-200 font-bold text-xs uppercase tracking-wider border border-gray-200 dark:border-white/10 transition-all shadow-sm"
            title="Generador de Reportes de Acceso"
          >
            <FileText className="w-4 h-4" />
            Reportes
          </button>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12 flex flex-col justify-center">
        
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-semibold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <Layers className="w-3.5 h-3.5" />
            Selección de Ubicación Operativa
          </div>
          <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 dark:text-white serif-brand tracking-tight mb-3">
            ¿Dónde deseas gestionar el acceso?
          </h2>
          <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400 font-normal">
            Selecciona el punto de control para registrar ingresos de socios, validación de cuotas, préstamos de llaves y entrega de toallas.
          </p>
        </div>

        {/* 3 Interactive Point Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Caseta de Ingreso (Portería General) */}
          <div 
            onClick={() => navigate('/gatehouse')}
            className="group relative bg-white dark:bg-[#0c120f] border-2 border-gray-200 dark:border-brand-gold/20 hover:border-brand-gold rounded-3xl p-8 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-[0_0_40px_rgba(212,175,55,0.25)] flex flex-col justify-between hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-bl-[100px] pointer-events-none transition-all group-hover:scale-125 group-hover:bg-brand-gold/20"></div>

            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-gold to-yellow-600 flex items-center justify-center text-black shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                  Acceso Principal
                </span>
              </div>

              <span className="text-[11px] font-extrabold tracking-widest uppercase text-brand-gold block mb-1">
                PUNTO 01
              </span>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-brand-gold transition-colors serif-brand">
                Caseta de Ingreso
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Control de portería principal. Validación de socios, lectura de carnet/QR, registro de vehículos, transeúntes e invitados al Club.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Registro al Club
                </span>
                <span className="flex items-center gap-1 text-brand-gold group-hover:translate-x-1.5 transition-transform">
                  Entrar a Caseta <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Piscina */}
          <div 
            onClick={() => navigate('/access/piscina')}
            className="group relative bg-white dark:bg-[#0c120f] border-2 border-gray-200 dark:border-cyan-500/20 hover:border-cyan-400 rounded-3xl p-8 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-col justify-between hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-[100px] pointer-events-none transition-all group-hover:scale-125 group-hover:bg-cyan-500/20"></div>

            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Waves className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Área Acuática
                </span>
              </div>

              <span className="text-[11px] font-extrabold tracking-widest uppercase text-cyan-400 block mb-1">
                PUNTO 02
              </span>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-cyan-400 transition-colors serif-brand">
                Área de Piscina
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Control de concurrencia en piscina temperada. Registro rápido con teclado, asignación de llaves de vestidor y entrega de toallas.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  <span className="text-xs text-gray-500">Dentro ahora:</span>
                  <span className="text-xs font-bold text-cyan-400">{summary.piscinaInside} socios</span>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Hoy: {summary.piscinaToday}</span>
              </div>
              <div className="flex items-center justify-end text-xs font-semibold text-cyan-400 group-hover:translate-x-1.5 transition-transform">
                <span className="flex items-center gap-1">
                  Gestionar Piscina <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Gimnasio */}
          <div 
            onClick={() => navigate('/access/gimnasio')}
            className="group relative bg-white dark:bg-[#0c120f] border-2 border-gray-200 dark:border-emerald-500/20 hover:border-emerald-400 rounded-3xl p-8 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-[0_0_40px_rgba(16,185,129,0.25)] flex flex-col justify-between hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px] pointer-events-none transition-all group-hover:scale-125 group-hover:bg-emerald-500/20"></div>

            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Dumbbell className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Área Fitness
                </span>
              </div>

              <span className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-400 block mb-1">
                PUNTO 03
              </span>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-400 transition-colors serif-brand">
                Área de Gimnasio
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Control de asistencia a sala de máquinas y musculación. Asignación de casilleros, toallas y registro de profesores/externos.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="text-xs text-gray-500">Dentro ahora:</span>
                  <span className="text-xs font-bold text-emerald-400">{summary.gimnasioInside} socios</span>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Hoy: {summary.gimnasioToday}</span>
              </div>
              <div className="flex items-center justify-end text-xs font-semibold text-emerald-400 group-hover:translate-x-1.5 transition-transform">
                <span className="flex items-center gap-1">
                  Gestionar Gimnasio <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full p-6 text-center text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-sm">
        <span>Sistema de Gestión de Acceso y Control de Socios &bull; Club Hípico Los Sargentos</span>
      </footer>

    </div>
  );
};

export default AccessPointSelection;
