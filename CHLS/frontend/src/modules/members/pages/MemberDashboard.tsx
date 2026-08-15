import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { fetchCurrentProfile } from '@store/membersSlice';
import CrestLogo from '@shared/components/CrestLogo';
import { 
  Users, 
  CalendarCheck, 
  CreditCard, 
  History, 
  Car, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  UserPlus,
  QrCode,
  Waves,
  Dumbbell,
  Sparkles,
  Activity
} from 'lucide-react';
import { logout } from '@store/authSlice';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@shared/components/LanguageToggle';

export const MemberDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentProfile } = useSelector((state: RootState) => state.members);
  
  useEffect(() => {
    dispatch(fetchCurrentProfile());
  }, [dispatch]);

  // Fallback empty state if no profile is found yet (useful since the DB is empty now)
  const socio = currentProfile || {
    membershipNumber: 'N/A',
    status: 'NO ENCONTRADA',
    category: 'N/A',
    antiquityYears: 0,
    beneficiariesCount: 0,
    horsesCount: 0,
    vehiclesCount: 0,
    reservationsThisMonth: 0,
    debt: 0,
    lastEntry: 'Sin registros',
    nextQuotaDate: 'N/A'
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success(t('header.logoutSuccess'));
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans pb-20 md:pb-0">
      
      {/* Background Aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      {/* Premium Header */}
      <header className="relative z-10 pt-12 pb-6 px-6 sticky top-0 backdrop-blur-md theme-search-bg border-b border-brand-gold/20 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <CrestLogo size="sm" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight theme-title serif-brand">
              {t('dashboard.title')} #{socio.membershipNumber}
            </h1>
            <p className="text-xs theme-subtitle font-semibold tracking-widest uppercase mt-1">{t('dashboard.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button 
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-gray-500/10 transition-colors"
            title={t('header.logout')}
          >
            <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </header>

      <main className="relative z-10 px-6 py-8 max-w-4xl mx-auto space-y-8">
        
        {/* Live Club Occupancy Widget */}
        <section 
          onClick={() => navigate('/member/occupancy')}
          className="relative glass-panel p-5 border border-brand-gold/30 hover:border-brand-gold rounded-3xl bg-gradient-to-r from-cyan-950/20 via-black/40 to-emerald-950/20 cursor-pointer group shadow-lg hover:shadow-brand-gold/10 transition-all overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/20 text-brand-gold flex items-center justify-center font-black shadow-inner group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
                    EN VIVO
                  </span>
                  <span className="text-xs text-brand-gold font-bold uppercase tracking-wider">
                    Semáforo de Aforo
                  </span>
                </div>
                <h3 className="text-base font-extrabold theme-text group-hover:text-brand-gold transition-colors">
                  ¿Cuan lleno está el Club ahora?
                </h3>
                <p className="text-xs theme-subtitle">
                  Consulta el aforo en tiempo real de Piscina, Gimnasio y Canchas antes de venir.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-xs font-bold text-brand-gold uppercase tracking-wider group-hover:underline">
                Ver Semáforo Completo
              </span>
              <ChevronRight className="w-4 h-4 text-brand-gold group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </section>

        {/* Sección 1: Perfil y Membresía Principal */}
        <section className="glass-panel p-6 border-l-4 border-brand-green dark:border-brand-gold relative overflow-hidden group">
          <div className="absolute -right-12 -top-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <ShieldCheck className="w-48 h-48 theme-title" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-green/10 dark:bg-brand-gold/20">
                <CheckCircle2 className="w-5 h-5 text-brand-green dark:text-brand-gold" />
              </div>
              <h2 className="text-xl font-bold theme-text uppercase tracking-widest">
                {t('dashboard.menus.myMembership')} {socio.status === 'NO ENCONTRADA' ? t('dashboard.membership.notFound') : socio.status}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
              <div>
                <p className="text-xs theme-subtitle uppercase tracking-wider mb-1">Categoría</p>
                <p className="text-lg font-bold theme-text">{socio.category}</p>
              </div>
              <div>
                <p className="text-xs theme-subtitle uppercase tracking-wider mb-1">{t('dashboard.kpis.seniority')}</p>
                <p className="text-lg font-bold theme-text">{socio.antiquityYears} años</p>
              </div>
              <div>
                <p className="text-xs theme-subtitle uppercase tracking-wider mb-1">{t('dashboard.kpis.debt')}</p>
                <p className={`text-lg font-bold ${socio.debt > 0 ? 'text-red-500' : 'text-brand-green dark:text-brand-gold'}`}>
                  Bs {socio.debt.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs theme-subtitle uppercase tracking-wider mb-1">Próxima Cuota</p>
                <p className="text-lg font-bold theme-text">{socio.nextQuotaDate}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 2: KPIs y Activos */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
            <Users className="w-6 h-6 theme-title mb-2 opacity-80" />
            <span className="text-2xl font-bold theme-text">{socio.beneficiariesCount}</span>
            <span className="text-xs theme-subtitle uppercase tracking-widest mt-1">Beneficiarios</span>
          </div>
          
          <div className="glass-panel p-5 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
            <ShieldCheck className="w-6 h-6 theme-title mb-2 opacity-80" />
            <span className="text-2xl font-bold theme-text">{socio.horsesCount}</span>
            <span className="text-xs theme-subtitle uppercase tracking-widest mt-1">{t('dashboard.kpis.horses')}</span>
          </div>

          <div className="glass-panel p-5 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
            <Car className="w-6 h-6 theme-title mb-2 opacity-80" />
            <span className="text-2xl font-bold theme-text">{socio.vehiclesCount}</span>
            <span className="text-xs theme-subtitle uppercase tracking-widest mt-1">{t('dashboard.kpis.vehicles')}</span>
          </div>

          <div className="glass-panel p-5 flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform cursor-pointer">
            <CalendarCheck className="w-6 h-6 theme-title mb-2 opacity-80" />
            <span className="text-2xl font-bold theme-text">{socio.reservationsThisMonth}</span>
            <span className="text-xs theme-subtitle uppercase tracking-widest mt-1">Reservas Mes</span>
          </div>
        </section>

        {/* Sección 3: Última Actividad */}
        <section className="glass-panel p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold theme-text">{t('dashboard.lastActivity')}</p>
              <p className="text-xs theme-subtitle">{socio.lastEntry === 'Sin registros' ? t('dashboard.noActivity') : socio.lastEntry}</p>
            </div>
          </div>
          <button className="text-xs theme-title hover:underline uppercase tracking-widest font-semibold flex items-center gap-1">
            Ver Todos <ChevronRight className="w-4 h-4" />
          </button>
        </section>

        {/* Sección 4: Acciones Rápidas (Botonera Premium) */}
        <section>
          <h3 className="text-sm font-bold theme-text mb-4 uppercase tracking-widest serif-brand border-b border-brand-gold/20 pb-2">
            {t('dashboard.quickActions')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button 
              onClick={() => navigate('/member/reservations')}
              className="glass-button-primary flex flex-col items-center justify-center py-4 gap-2 h-auto text-xs whitespace-normal"
            >
              <CalendarCheck className="w-5 h-5" />
              <span>Reservar</span>
            </button>
            <button className="glass-button-primary flex flex-col items-center justify-center py-4 gap-2 h-auto text-xs whitespace-normal">
              <UserPlus className="w-5 h-5" />
              <span className="text-center">{t('dashboard.actions.family')}</span>
            </button>
            <button className="glass-button-primary flex flex-col items-center justify-center py-4 gap-2 h-auto text-xs whitespace-normal">
              <CreditCard className="w-5 h-5" />
              <span>{t('dashboard.actions.pay')}</span>
            </button>
            <button className="glass-button-primary flex flex-col items-center justify-center py-4 gap-2 h-auto text-xs whitespace-normal">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-center">{t('dashboard.actions.horse')}</span>
            </button>
            <button className="glass-button-primary flex flex-col items-center justify-center py-4 gap-2 h-auto text-xs whitespace-normal col-span-2 md:col-span-1">
              <History className="w-5 h-5" />
              <span>Historial</span>
            </button>
          </div>
        </section>

        {/* QR Code Action */}
        <section className="pt-4 flex justify-center">
           <button className="flex items-center gap-2 theme-title hover:opacity-80 transition-opacity font-semibold uppercase tracking-widest text-sm">
             <QrCode className="w-5 h-5" />
             Mostrar Credencial Digital
           </button>
        </section>

      </main>
    </div>
  );
};
