import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@store/store';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquare, Users, Settings, LogOut, CalendarDays, Activity, Waves, Dumbbell, CalendarCheck } from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { logout } from '@store/authSlice';
import toast from 'react-hot-toast';

export const MainPortal: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  if (!user) return null;

  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
  const isAdmin = user.roles.includes('ADMIN') || isSuperAdmin;
  const isStaff = user.roles.includes('MODULO_USUARIO_PQRS');
  const isMember = user.roles.includes('USER');
  const isPqrsUser = user.roles.includes('MODULO_PQRS') || user.roles.includes('MODULO_USUARIO_PQRS') || isAdmin;
  const isWhatsappUser = user.roles.includes('MODULO_WHATSAPP') || isSuperAdmin;

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión cerrada correctamente');
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans flex flex-col">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center border-b border-brand-gold/10">
        <div className="flex items-center gap-4">
          <CrestLogo size="sm" />
        </div>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm font-semibold tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            CERRAR SESIÓN
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row p-6 lg:p-12 gap-12 items-center lg:items-stretch">
        
        {/* Left Side - Welcome & Profile */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-gold to-yellow-600 text-black shadow-[0_0_30px_rgba(212,175,55,0.3)]">
             <span className="text-3xl font-bold">
               {user.firstName 
                 ? `${user.firstName.charAt(0)}${user.lastName ? user.lastName.charAt(0) : ''}`.toUpperCase()
                 : user.email.substring(0, 2).toUpperCase()}
             </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 serif-brand tracking-tight">
            Bienvenido,<br/> <span className="text-brand-gold">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0]}</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Selecciona un módulo en el panel derecho para comenzar a trabajar.
          </p>
          
          <div className="glass-panel p-6 border-l-4 border-brand-gold max-w-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-4">Información de Sesión</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-900 dark:text-white font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nivel de Acceso:</span>
                <span className="text-brand-gold font-bold">
                  {isSuperAdmin ? 'Administrador Maestro' 
                    : isAdmin ? 'Administrador' 
                    : user.roles.includes('MODULO_WHATSAPP') ? 'Personal Administrativo'
                    : user.roles.includes('MODULO_PQRS') ? 'Administrador PQRS'
                    : isStaff ? 'Personal Administrativo' 
                    : 'Socio'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Modules List */}
        <div className="flex-1 w-full flex flex-col justify-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 border-b border-gray-200 dark:border-white/10 pb-2">
            Módulos Habilitados
          </h2>
          
          <div className="grid gap-4">
            
            {isSuperAdmin && (
              <Link 
                to="/superadmin"
                className="group flex items-center p-6 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-2xl hover:border-brand-gold transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300 mr-6">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-500 transition-colors">
                    Gestión de Usuarios
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Administración de personal, permisos y creación de perfiles institucionales.
                  </p>
                </div>
              </Link>
            )}
            
            {isAdmin && (
              <Link 
                to="/access-selection"
                className="group flex items-center p-6 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-2xl hover:border-brand-gold transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                <div className="w-14 h-14 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform duration-300 mr-6">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand-gold transition-colors">
                    Control de Acceso
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Puntos de control: Caseta Principal, Piscina y Gimnasio.
                  </p>
                </div>
              </Link>
            )}

            {isWhatsappUser && (
              <Link 
                to="/admin/whatsapp"
                className="group flex items-center p-6 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-2xl hover:border-brand-gold transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform duration-300 mr-6">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-green-500 transition-colors">
                    Envío Masivo (WhatsApp)
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Campañas de mensajería masiva y comunicación directa con socios.
                  </p>
                </div>
              </Link>
            )}

            {isPqrsUser && (
              <Link 
                to="/admin/pqrs"
                className="group flex items-center p-6 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-2xl hover:border-brand-gold transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-300 mr-6">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-amber-500 transition-colors">
                    Módulo PQRS
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gestión de Peticiones, Quejas, Reclamos y Sugerencias de los socios.
                  </p>
                </div>
              </Link>
            )}

            {isAdmin && (
              <Link 
                to="/admin/reservations"
                className="group flex items-center p-6 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-2xl hover:border-brand-gold transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 mr-6 shadow-sm">
                  <CalendarDays className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-400 transition-colors">
                    Gestión de Canchas
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Administración de reservas deportivas, horarios y aprobaciones.
                  </p>
                </div>
              </Link>
            )}

            {/* Reserva de Canchas para Socios (En Vivo) */}
            <Link 
              to="/member/reservations"
              className="group flex items-center p-5 sm:p-6 bg-white dark:bg-[#0a100d] border border-emerald-500/30 rounded-2xl hover:border-emerald-400 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              <div className="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-brand-gold/20 border border-emerald-500/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mr-5 shadow-sm text-emerald-400">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap sm:flex-nowrap">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                    Reserva de Canchas
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-[#00ff87] border border-[#00ff87]/50 shadow-[0_0_10px_rgba(0,255,135,0.4)] animate-pulse shrink-0 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] shadow-[0_0_6px_#00ff87]"></span>
                    (En Vivo)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                    SOCIOS
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Reserva tu turno deportivo (Tenis, Pádel, Frontón, Fútbol) en tiempo real.
                </p>
              </div>
            </Link>

            {/* Semáforo de Aforo en Tiempo Real */}
            <Link 
              to="/member/occupancy"
              className="group flex items-center p-5 sm:p-6 bg-white dark:bg-[#0a100d] border border-cyan-500/20 dark:border-cyan-500/30 rounded-2xl hover:border-cyan-400 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
            >
              <div className="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/15 to-emerald-500/15 border border-cyan-500/30 flex items-center justify-center gap-1 group-hover:scale-110 transition-transform duration-300 mr-5 shadow-sm">
                <Waves className="w-5 h-5 text-cyan-400" />
                <Dumbbell className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap sm:flex-nowrap">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                    Semáforo: Piscina y Gimnasio
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-[#00ff87] border border-[#00ff87]/50 shadow-[0_0_10px_rgba(0,255,135,0.4)] animate-pulse shrink-0 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] shadow-[0_0_6px_#00ff87]"></span>
                    (En Vivo)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                    SOCIOS
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Consulta cuán lleno está el club (Piscina y Gimnasio) antes de asistir.
                </p>
              </div>
            </Link>

            <Link 
              to="/member"
              className="group flex items-center p-6 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-2xl hover:border-brand-gold transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform duration-300 mr-6">
                <Settings className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-500 transition-colors">
                  Portal del Socio
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Visualiza tu membresía, credencial digital, historial y estados de cuenta.
                </p>
              </div>
            </Link>

          </div>
        </div>

      </main>
    </div>
  );
};

export default MainPortal;
